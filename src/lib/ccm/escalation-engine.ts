import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/ccm/audit-logger";

// ============================================
// AUTOMATED SLA TRACKING & ESCALATION ENGINE
// ============================================

export interface EscalationRule {
  severity: string;
  maxOpenHours: number;
  escalationSteps: {
    afterHours: number;
    action:
      | "NOTIFY_ASSIGNEE"
      | "NOTIFY_MANAGER"
      | "UPGRADE_SEVERITY"
      | "AUTO_ASSIGN"
      | "NOTIFY_EXECUTIVE";
    details?: string;
  }[];
}

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    severity: "CRITICAL",
    maxOpenHours: 4,
    escalationSteps: [
      { afterHours: 4, action: "NOTIFY_ASSIGNEE" },
      { afterHours: 8, action: "NOTIFY_MANAGER" },
      { afterHours: 24, action: "NOTIFY_EXECUTIVE" },
      { afterHours: 48, action: "UPGRADE_SEVERITY" },
    ],
  },
  {
    severity: "HIGH",
    maxOpenHours: 24,
    escalationSteps: [
      { afterHours: 24, action: "NOTIFY_ASSIGNEE" },
      { afterHours: 48, action: "NOTIFY_MANAGER" },
      { afterHours: 72, action: "AUTO_ASSIGN" },
      { afterHours: 168, action: "UPGRADE_SEVERITY" },
    ],
  },
  {
    severity: "MEDIUM",
    maxOpenHours: 72,
    escalationSteps: [
      { afterHours: 72, action: "NOTIFY_ASSIGNEE" },
      { afterHours: 168, action: "NOTIFY_MANAGER" },
      { afterHours: 336, action: "AUTO_ASSIGN" },
    ],
  },
  {
    severity: "LOW",
    maxOpenHours: 168,
    escalationSteps: [
      { afterHours: 168, action: "NOTIFY_ASSIGNEE" },
      { afterHours: 336, action: "NOTIFY_MANAGER" },
    ],
  },
];

export interface EscalationResult {
  organizationId: string;
  findingsProcessed: number;
  escalationsTriggered: number;
  actions: {
    findingId: string;
    findingTitle: string;
    severity: string;
    hoursOpen: number;
    action: string;
    details: string;
  }[];
  errors: string[];
}

const SEVERITY_UPGRADE_MAP: Record<string, string> = {
  LOW: "MEDIUM",
  MEDIUM: "HIGH",
  HIGH: "CRITICAL",
};

/**
 * Parses the escalation log embedded in a finding's aiAnalysis field.
 * Returns the set of escalation step keys already executed.
 */
function getAlreadyEscalated(aiAnalysis: string | null): Set<string> {
  const escalated = new Set<string>();
  if (!aiAnalysis) return escalated;

  const regex = /\[ESCALATION:(\w+)@(\d+)h[^\]]*\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(aiAnalysis)) !== null) {
    escalated.add(`${match[1]}@${match[2]}`);
  }
  return escalated;
}

/**
 * Run escalation check for all open findings in an organization.
 * Checks SLA timelines and triggers appropriate escalation actions.
 */
export async function runEscalationCheck(
  organizationId: string
): Promise<EscalationResult> {
  const result: EscalationResult = {
    organizationId,
    findingsProcessed: 0,
    escalationsTriggered: 0,
    actions: [],
    errors: [],
  };

  const findings = await db.finding.findMany({
    where: {
      organizationId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      assignedTo: true,
      aiAnalysis: true,
      createdAt: true,
    },
  });

  const now = Date.now();

  for (const finding of findings) {
    try {
      result.findingsProcessed++;

      const hoursOpen =
        (now - finding.createdAt.getTime()) / (60 * 60 * 1000);

      const escalationRule = DEFAULT_ESCALATION_RULES.find(
        (r) => r.severity === finding.severity
      );
      if (!escalationRule) continue;

      const alreadyEscalated = getAlreadyEscalated(finding.aiAnalysis);

      // Find all applicable escalation steps that haven't been executed yet
      const applicableSteps = escalationRule.escalationSteps.filter(
        (step) =>
          hoursOpen >= step.afterHours &&
          !alreadyEscalated.has(`${step.action}@${step.afterHours}`)
      );

      if (applicableSteps.length === 0) continue;

      for (const step of applicableSteps) {
        let details = `Finding "${finding.title}" has been open for ${Math.round(hoursOpen)}h (SLA: ${escalationRule.maxOpenHours}h).`;

        switch (step.action) {
          case "UPGRADE_SEVERITY": {
            const newSeverity =
              SEVERITY_UPGRADE_MAP[finding.severity] || finding.severity;
            if (newSeverity !== finding.severity) {
              await db.finding.update({
                where: { id: finding.id },
                data: { severity: newSeverity as any },
              });
              details = `Severity upgraded from ${finding.severity} to ${newSeverity} after ${step.afterHours}h open.`;
            } else {
              details = `Severity already at maximum (${finding.severity}).`;
            }
            break;
          }

          case "AUTO_ASSIGN": {
            if (!finding.assignedTo) {
              const assignResult = await autoAssignFindings(organizationId, [
                finding.id,
              ]);
              if (assignResult.assigned > 0) {
                details = `Auto-assigned to ${assignResult.assignments[0].assignedTo}: ${assignResult.assignments[0].reason}`;
              } else {
                details = `Auto-assign attempted but no eligible members found.`;
              }
            } else {
              details = `Finding already assigned to ${finding.assignedTo}.`;
            }
            break;
          }

          case "NOTIFY_ASSIGNEE":
            details = finding.assignedTo
              ? `Notification sent to assignee ${finding.assignedTo}: finding open ${Math.round(hoursOpen)}h.`
              : `No assignee to notify. Finding open ${Math.round(hoursOpen)}h.`;
            break;

          case "NOTIFY_MANAGER":
            details = `Manager notification triggered: finding open ${Math.round(hoursOpen)}h, severity ${finding.severity}.`;
            break;

          case "NOTIFY_EXECUTIVE":
            details = `Executive escalation triggered: ${finding.severity} finding open ${Math.round(hoursOpen)}h.`;
            break;
        }

        // Record the escalation marker in aiAnalysis to prevent re-triggering
        const marker = `\n[ESCALATION:${step.action}@${step.afterHours}h at ${new Date().toISOString()}]`;
        await db.finding.update({
          where: { id: finding.id },
          data: {
            aiAnalysis: (finding.aiAnalysis || "") + marker,
          },
        });
        // Keep local copy in sync for subsequent steps in the same finding
        finding.aiAnalysis = (finding.aiAnalysis || "") + marker;

        // Log audit event for the escalation
        await logAuditEvent({
          organizationId,
          userId: "system",
          action: "UPDATE_FINDING_STATUS",
          resourceType: "finding",
          resourceId: finding.id,
          details: {
            escalationAction: step.action,
            hoursOpen: Math.round(hoursOpen),
            afterHours: step.afterHours,
            details,
          },
        });

        result.actions.push({
          findingId: finding.id,
          findingTitle: finding.title,
          severity: finding.severity,
          hoursOpen: Math.round(hoursOpen),
          action: step.action,
          details,
        });
        result.escalationsTriggered++;
      }
    } catch (err) {
      result.errors.push(
        `Finding ${finding.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

/**
 * Auto-assign unassigned findings to team members based on workload.
 * Assigns to the member with the fewest open assignments (round-robin for ties).
 *
 * @param organizationId - The organization to assign within
 * @param findingIds - Optional specific finding IDs. If omitted, all unassigned open findings are used.
 */
export async function autoAssignFindings(
  organizationId: string,
  findingIds?: string[]
): Promise<{
  assigned: number;
  assignments: { findingId: string; assignedTo: string; reason: string }[];
}> {
  const assignments: {
    findingId: string;
    assignedTo: string;
    reason: string;
  }[] = [];

  // Get eligible members (ANALYST or ADMIN roles, active)
  const members = await db.cCMOrganizationMember.findMany({
    where: {
      organizationId,
      isActive: true,
      role: { in: ["ANALYST", "ADMIN"] },
    },
    select: { userId: true, role: true },
  });

  if (members.length === 0) {
    return { assigned: 0, assignments };
  }

  // Count current open assignments per member
  const workloadCounts = new Map<string, number>();
  for (const member of members) {
    const count = await db.finding.count({
      where: {
        organizationId,
        assignedTo: member.userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });
    workloadCounts.set(member.userId, count);
  }

  // Sort members by workload ascending, then by role (ANALYST first for round-robin tie-break)
  const sortedMembers = [...members].sort((a, b) => {
    const countA = workloadCounts.get(a.userId) || 0;
    const countB = workloadCounts.get(b.userId) || 0;
    if (countA !== countB) return countA - countB;
    // Tie-break: ANALYST before ADMIN (analysts are primary workers)
    if (a.role === "ANALYST" && b.role !== "ANALYST") return -1;
    if (b.role === "ANALYST" && a.role !== "ANALYST") return 1;
    return a.userId.localeCompare(b.userId);
  });

  // Get findings to assign
  const whereClause: Record<string, unknown> = {
    organizationId,
    assignedTo: null,
    status: { in: ["OPEN", "IN_PROGRESS"] },
  };
  if (findingIds?.length) {
    whereClause.id = { in: findingIds };
  }

  const unassigned = await db.finding.findMany({
    where: whereClause,
    select: { id: true, title: true, severity: true },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  // Round-robin assignment starting from least loaded
  let memberIndex = 0;
  for (const finding of unassigned) {
    const member = sortedMembers[memberIndex % sortedMembers.length];
    const currentLoad = workloadCounts.get(member.userId) || 0;

    await db.finding.update({
      where: { id: finding.id },
      data: { assignedTo: member.userId },
    });

    await logAuditEvent({
      organizationId,
      userId: "system",
      action: "ASSIGN_FINDING",
      resourceType: "finding",
      resourceId: finding.id,
      details: {
        assignedTo: member.userId,
        reason: "auto-assigned",
        workload: currentLoad,
      },
    });

    workloadCounts.set(member.userId, currentLoad + 1);

    assignments.push({
      findingId: finding.id,
      assignedTo: member.userId,
      reason: `Auto-assigned (workload: ${currentLoad} open findings, role: ${member.role})`,
    });

    memberIndex++;
  }

  return { assigned: assignments.length, assignments };
}
