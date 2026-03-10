import { db } from "@/lib/db";
import { routeLLMRequest } from "../llm-router";
import { evaluateRule } from "../rule-engine";
import type { ERPDataPoint, MonitoringRule } from "@prisma/client";

// ============================================
// REMEDIATION EXECUTOR WORKFLOW
// Autonomous remediation plan execution
// ============================================

export interface RemediationExecutionResult {
  findingId: string;
  planId: string;
  tasksCreated: number;
  autoAssigned: number;
  findingStatusUpdated: boolean;
  verificationRun: boolean;
  verificationPassed: boolean | null;
  evidenceCreated: number;
  notificationsPrepared: number;
  reasoning: string;
  tokensUsed: number;
}

interface RemediationTask {
  title: string;
  description: string;
  assignedTo: string | null;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  estimatedHours: number;
  dueInDays: number;
  category: string;
}

function parseJSONFromLLM(content: string): unknown {
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * Executes a remediation plan for a finding.
 *
 * Steps:
 * 1. Validate plan exists and is actionable
 * 2. Break plan into executable tasks with owners/deadlines
 * 3. Auto-assign tasks to team members based on role (if enabled)
 * 4. Update finding status through lifecycle
 * 5. Re-run monitoring rule to verify fix (if enabled)
 * 6. Create evidence records documenting remediation
 * 7. Prepare notification payloads
 */
export async function executeRemediation(
  organizationId: string,
  findingId: string,
  options?: {
    autoAssign?: boolean;
    autoVerify?: boolean;
    dryRun?: boolean;
  }
): Promise<RemediationExecutionResult> {
  const { autoAssign = true, autoVerify = true, dryRun = false } = options || {};
  let totalTokens = 0;
  let evidenceCreated = 0;
  let notificationsPrepared = 0;

  // ── Step 1: Validate ────────────────────────────────────────
  const finding = await db.finding.findFirst({
    where: { id: findingId, organizationId },
    include: {
      rule: true,
      remediationPlan: true,
      dataPoints: { include: { dataPoint: true } },
      evidence: { select: { id: true } },
    },
  });

  if (!finding) {
    throw new Error(`Finding ${findingId} not found in organization ${organizationId}`);
  }

  if (!finding.remediationPlan) {
    throw new Error(`Finding ${findingId} has no remediation plan. Generate one first.`);
  }

  if (finding.status === "CLOSED" || finding.status === "REMEDIATED") {
    throw new Error(`Finding ${findingId} is already ${finding.status}. No action needed.`);
  }

  const plan = finding.remediationPlan;
  const planSteps = plan.steps as Record<string, unknown>[] | { steps?: Record<string, unknown>[] };
  const steps = Array.isArray(planSteps)
    ? planSteps
    : Array.isArray((planSteps as { steps?: unknown }).steps)
      ? (planSteps as { steps: Record<string, unknown>[] }).steps
      : [];

  if (steps.length === 0) {
    throw new Error(`Remediation plan ${plan.id} has no actionable steps.`);
  }

  // ── Step 2: Get Org Members for Assignment ──────────────────
  const orgMembers = await db.cCMOrganizationMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // ── Step 3: Use LLM to Break Plan into Tasks ───────────────
  const taskGenerationPrompt = `You are a compliance remediation coordinator. Given a remediation plan and available team members, create specific executable tasks.

Remediation Plan Steps:
${JSON.stringify(steps, null, 2)}

Finding Details:
- Title: ${finding.title}
- Severity: ${finding.severity}
- Framework: ${finding.framework}
- Control ID: ${finding.controlId || "N/A"}
- Description: ${finding.description}

Available Team Members:
${orgMembers.map((m) => `- ${m.user.name || m.user.email} (ID: ${m.userId}, Role: ${m.role})`).join("\n")}

Create tasks as JSON array. Each task:
{
  "title": "<clear task title>",
  "description": "<detailed instructions>",
  "assignedTo": "<userId or null if unknown>",
  "priority": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "estimatedHours": <number>,
  "dueInDays": <number of days from now>,
  "category": "<TECHNICAL|PROCESS|DOCUMENTATION|REVIEW|TESTING>"
}

Assignment rules:
- OWNER members: approval and oversight tasks
- ADMIN members: configuration and policy changes
- MEMBER roles: execution and documentation tasks
- If only one member exists, assign all tasks to them
${autoAssign ? "- Auto-assign all tasks to the best-matching member" : "- Set assignedTo to null (manual assignment required)"}

For ${finding.severity} severity, ensure tasks have tight deadlines:
- CRITICAL: 1-3 days
- HIGH: 3-7 days
- MEDIUM: 7-14 days
- LOW: 14-30 days

Return a JSON array of tasks ONLY. No explanations.`;

  const taskResponse = await routeLLMRequest(organizationId, {
    systemPrompt: "You are a task planning assistant. Return only valid JSON arrays.",
    userPrompt: taskGenerationPrompt,
    maxTokens: 4000,
    temperature: 0.2,
  });
  totalTokens += taskResponse.inputTokens + taskResponse.outputTokens;

  let tasks: RemediationTask[];
  try {
    tasks = parseJSONFromLLM(taskResponse.content) as RemediationTask[];
    if (!Array.isArray(tasks)) tasks = [];
  } catch {
    // Fallback: create one task per step
    tasks = steps.map((step, i) => ({
      title: String((step as Record<string, unknown>).title || (step as Record<string, unknown>).action || `Step ${i + 1}`),
      description: String((step as Record<string, unknown>).description || (step as Record<string, unknown>).details || JSON.stringify(step)),
      assignedTo: orgMembers.length > 0 ? orgMembers[0].userId : null,
      priority: finding.severity === "CRITICAL" ? "CRITICAL" : finding.severity === "HIGH" ? "HIGH" : "MEDIUM" as const,
      estimatedHours: 4,
      dueInDays: finding.severity === "CRITICAL" ? 2 : 7,
      category: "TECHNICAL",
    }));
  }

  // ── Step 4: Persist Tasks & Update Status ───────────────────
  let tasksCreated = 0;
  let autoAssignedCount = 0;

  if (!dryRun) {
    // Update finding status to IN_PROGRESS
    await db.finding.update({
      where: { id: findingId },
      data: {
        status: "IN_PROGRESS",
        aiAnalysis: JSON.stringify({
          ...(finding.aiAnalysis ? JSON.parse(finding.aiAnalysis) : {}),
          remediationExecution: {
            startedAt: new Date().toISOString(),
            tasksPlanned: tasks.length,
            autoAssign,
            autoVerify,
          },
        }),
      },
    });

    // Create evidence for task breakdown
    for (const task of tasks) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (task.dueInDays || 7));

      // Store task details as evidence since we don't have a dedicated tasks table
      await db.evidence.create({
        data: {
          organizationId,
          findingId,
          type: "SYSTEM_REPORT",
          title: `Remediation Task: ${task.title}`,
          description: task.description,
          data: {
            taskType: "remediation_task",
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            dueDate: dueDate.toISOString(),
            assignedTo: task.assignedTo,
            category: task.category,
            status: "PENDING",
          },
          isAutoCollected: true,
          collectedBy: task.assignedTo || "system:remediation-executor",
        },
      });
      tasksCreated++;
      if (task.assignedTo) autoAssignedCount++;
    }

    // If the finding has an assignee field and we have a primary assignee, update it
    const primaryAssignee = tasks.find((t) => t.priority === "CRITICAL" || t.priority === "HIGH")?.assignedTo
      || tasks[0]?.assignedTo;
    if (primaryAssignee && autoAssign) {
      await db.finding.update({
        where: { id: findingId },
        data: { assignedTo: primaryAssignee },
      });
    }

    evidenceCreated += tasksCreated;
  }

  // ── Step 5: Verify Fix (Re-run Rule) ───────────────────────
  let verificationRun = false;
  let verificationPassed: boolean | null = null;

  if (autoVerify && !dryRun && finding.rule) {
    try {
      // Pull fresh data points for the rule's domain
      const freshDataPoints = await db.eRPDataPoint.findMany({
        where: {
          connector: { organizationId },
          domain: finding.rule.domain === "ALL" ? undefined : finding.rule.domain,
          pulledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        take: 1000,
      });

      if (freshDataPoints.length > 0) {
        const { violations } = await evaluateRule(
          finding.rule as MonitoringRule,
          freshDataPoints as ERPDataPoint[]
        );
        verificationRun = true;

        // Check if the specific data points from this finding still violate
        const findingDpIds = new Set(finding.dataPoints.map((fdp) => fdp.dataPointId));
        const stillViolating = violations.filter((v) => findingDpIds.has(v.id));
        verificationPassed = stillViolating.length === 0;

        if (verificationPassed) {
          await db.finding.update({
            where: { id: findingId },
            data: {
              status: "REMEDIATED",
              resolvedAt: new Date(),
              resolvedBy: "system:remediation-executor",
              resolutionNotes: "Automatically verified — rule re-evaluation shows no remaining violations.",
            },
          });

          // Create verification evidence
          await db.evidence.create({
            data: {
              organizationId,
              findingId,
              type: "TEST_RESULT",
              title: "Automated Remediation Verification",
              description: `Rule re-evaluation passed. ${freshDataPoints.length} data points scanned, ${violations.length} total violations remaining (none matching this finding).`,
              data: {
                verifiedAt: new Date().toISOString(),
                dataPointsScanned: freshDataPoints.length,
                totalViolations: violations.length,
                findingViolationsRemaining: 0,
                result: "PASSED",
              },
              isAutoCollected: true,
              collectedBy: "system:remediation-executor",
            },
          });
          evidenceCreated++;
        }
      }
    } catch (err) {
      console.warn(
        "[Remediation Executor] Verification failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // ── Step 6: Prepare Notifications ───────────────────────────
  const notifications: {
    recipientId: string;
    type: string;
    message: string;
  }[] = [];

  // Notify assignees
  const assignees = Array.from(new Set(tasks.filter((t) => t.assignedTo).map((t) => t.assignedTo!)));
  for (const assigneeId of assignees) {
    const assigneeTasks = tasks.filter((t) => t.assignedTo === assigneeId);
    notifications.push({
      recipientId: assigneeId,
      type: "REMEDIATION_TASK_ASSIGNED",
      message: `You have been assigned ${assigneeTasks.length} remediation task(s) for finding: ${finding.title}. Severity: ${finding.severity}.`,
    });
    notificationsPrepared++;
  }

  // Notify owners if critical
  if (finding.severity === "CRITICAL" || finding.severity === "HIGH") {
    const owners = orgMembers.filter((m) => m.role === "OWNER");
    for (const owner of owners) {
      if (!assignees.includes(owner.userId)) {
        notifications.push({
          recipientId: owner.userId,
          type: "REMEDIATION_STARTED",
          message: `Remediation execution started for ${finding.severity} finding: ${finding.title}. ${tasksCreated} tasks created.`,
        });
        notificationsPrepared++;
      }
    }
  }

  // Notify if verification passed
  if (verificationPassed === true) {
    for (const owner of orgMembers.filter((m) => m.role === "OWNER")) {
      notifications.push({
        recipientId: owner.userId,
        type: "REMEDIATION_VERIFIED",
        message: `Finding "${finding.title}" has been remediated and verified automatically.`,
      });
      notificationsPrepared++;
    }
  }

  // Store notification payloads as evidence for the notification engine to pick up
  if (!dryRun && notifications.length > 0) {
    await db.evidence.create({
      data: {
        organizationId,
        findingId,
        type: "SYSTEM_REPORT",
        title: "Remediation Notifications",
        description: `${notifications.length} notification(s) prepared for stakeholders.`,
        data: { notifications, preparedAt: new Date().toISOString() },
        isAutoCollected: true,
        collectedBy: "system:remediation-executor",
      },
    });
    evidenceCreated++;
  }

  // ── Step 7: Generate Reasoning Summary ──────────────────────
  const reasoning = [
    `Remediation execution ${dryRun ? "(DRY RUN) " : ""}for finding "${finding.title}" (${finding.severity}).`,
    `Plan "${plan.id}" had ${steps.length} steps, decomposed into ${tasksCreated} actionable tasks.`,
    autoAssign ? `${autoAssignedCount} tasks auto-assigned to team members.` : "Tasks left unassigned for manual assignment.",
    verificationRun
      ? verificationPassed
        ? "Verification PASSED — rule re-evaluation shows no remaining violations."
        : "Verification FAILED — violations still detected after remediation."
      : "Verification not run (either disabled or no fresh data available).",
    `${notificationsPrepared} notification(s) prepared for stakeholders.`,
  ].join(" ");

  return {
    findingId,
    planId: plan.id,
    tasksCreated,
    autoAssigned: autoAssignedCount,
    findingStatusUpdated: !dryRun,
    verificationRun,
    verificationPassed,
    evidenceCreated,
    notificationsPrepared,
    reasoning,
    tokensUsed: totalTokens,
  };
}
