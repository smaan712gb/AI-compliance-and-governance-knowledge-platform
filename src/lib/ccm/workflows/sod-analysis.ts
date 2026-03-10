import { db } from "@/lib/db";
import { routeLLMRequest } from "../llm-router";
import { getDeepSeek } from "@/lib/deepseek";

// ============================================
// SoD ANALYSIS WORKFLOW
// Multi-step Segregation of Duties deep analysis
// ============================================

export interface SoDAnalysisResult {
  findingId: string;
  userId: string;
  conflictingRoles: string[];
  exploitationProbability: number;
  isExploited: boolean;
  exploitationEvidence: string[];
  transactionsAnalyzed: number;
  suspiciousTransactions: {
    date: string;
    type: string;
    amount?: number;
    reason: string;
  }[];
  recommendedAction:
    | "IMMEDIATE_REVOKE"
    | "WAIVER_WITH_MONITORING"
    | "ACCEPT_WITH_COMPENSATING"
    | "ESCALATE_TO_MANAGEMENT";
  compensatingControls: string[];
  reasoning: string;
  reasoningSteps: { step: number; thought: string; conclusion: string }[];
  autoRemediationApplied: boolean;
  tokensUsed: number;
}

/**
 * Parses JSON from an LLM response, handling markdown code blocks.
 */
function parseJSONFromLLM(content: string): unknown {
  let cleaned = content.trim();
  // Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Runs a deep SoD analysis workflow for a specific finding.
 *
 * Steps:
 * 1. Gather full context — user roles, transactions, access patterns
 * 2. Use DeepSeek R1 for deep reasoning about exploitation risk
 * 3. Cross-reference against other findings for the same user
 * 4. Calculate exploitation probability from transaction patterns
 * 5. Decide remediation action
 */
export async function runSoDAnalysisWorkflow(
  organizationId: string,
  findingId: string
): Promise<SoDAnalysisResult> {
  let totalTokens = 0;

  // ── Step 1: Gather Context ──────────────────────────────────
  const finding = await db.finding.findFirst({
    where: { id: findingId, organizationId },
    include: {
      rule: true,
      dataPoints: { include: { dataPoint: true } },
      evidence: true,
    },
  });

  if (!finding) {
    throw new Error(`Finding ${findingId} not found in organization ${organizationId}`);
  }

  // Extract user information from the finding's data points
  const dataPointsData = finding.dataPoints.map((fdp) => fdp.dataPoint.data as Record<string, unknown>);
  const primaryUser = extractUserId(dataPointsData);
  const conflictingRoles = extractConflictingRoles(dataPointsData, finding.rule?.ruleDefinition as Record<string, unknown> | null);

  // Pull user's full history — all data points referencing this user
  const userDataPoints = await db.eRPDataPoint.findMany({
    where: {
      connector: { organizationId },
      OR: [
        { data: { path: ["userId"], equals: primaryUser } },
        { data: { path: ["user"], equals: primaryUser } },
        { data: { path: ["username"], equals: primaryUser } },
        { externalId: primaryUser },
      ],
    },
    orderBy: { pulledAt: "desc" },
    take: 500,
  });

  // Separate data by type for analysis
  const roleHistory = userDataPoints.filter(
    (dp) => dp.dataType === "role_assignment" || dp.dataType === "user_role" || dp.domain === "ACCESS_CONTROL"
  );
  const transactions = userDataPoints.filter(
    (dp) => dp.dataType === "transaction" || dp.dataType === "journal_entry" || dp.dataType === "payment" || dp.domain === "SOX_CONTROLS"
  );
  const accessLogs = userDataPoints.filter(
    (dp) => dp.dataType === "access_log" || dp.dataType === "login" || dp.domain === "AUDIT_TRAIL"
  );

  // ── Step 2: Cross-Reference ─────────────────────────────────
  const relatedFindings = await db.finding.findMany({
    where: {
      organizationId,
      id: { not: findingId },
      OR: [
        { dataPoints: { some: { dataPoint: { externalId: primaryUser } } } },
        { assignedTo: primaryUser },
      ],
    },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      framework: true,
      createdAt: true,
    },
    take: 20,
  });

  // ── Step 3: Deep Reasoning with DeepSeek R1 ─────────────────
  const contextPayload = {
    finding: {
      id: finding.id,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      framework: finding.framework,
      controlId: finding.controlId,
      createdAt: finding.createdAt.toISOString(),
    },
    user: {
      userId: primaryUser,
      conflictingRoles,
      roleHistoryCount: roleHistory.length,
      roleHistory: roleHistory.slice(0, 30).map((dp) => ({
        data: dp.data,
        date: dp.dataDate?.toISOString() || dp.pulledAt.toISOString(),
      })),
    },
    transactions: {
      total: transactions.length,
      samples: transactions.slice(0, 50).map((dp) => ({
        type: dp.dataType,
        data: dp.data,
        date: dp.dataDate?.toISOString() || dp.pulledAt.toISOString(),
        flagged: dp.flagged,
      })),
    },
    accessPatterns: {
      total: accessLogs.length,
      recent: accessLogs.slice(0, 30).map((dp) => ({
        data: dp.data,
        date: dp.dataDate?.toISOString() || dp.pulledAt.toISOString(),
      })),
    },
    relatedFindings: relatedFindings.map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      status: f.status,
      framework: f.framework,
    })),
    ruleDefinition: finding.rule?.ruleDefinition || null,
  };

  const sodSystemPrompt = `You are an expert Segregation of Duties (SoD) analyst for enterprise compliance. You analyze user access patterns, role assignments, and transaction history to determine whether SoD conflicts have been exploited.

Your analysis must be thorough, evidence-based, and actionable. Consider:
1. Whether the conflicting roles were actually used together (not just assigned)
2. Transaction patterns that indicate potential exploitation (self-approvals, round-trip transactions, unusual amounts/timing)
3. Access log patterns (unusual hours, frequency spikes, access from unusual locations)
4. Whether compensating controls exist that mitigate the risk
5. Cross-reference with other compliance findings for systemic patterns

Return your analysis as JSON with this exact structure:
{
  "exploitationProbability": <number 0-100>,
  "isExploited": <boolean>,
  "exploitationEvidence": [<string descriptions of evidence found>],
  "suspiciousTransactions": [{"date": "<ISO>", "type": "<type>", "amount": <number|null>, "reason": "<why suspicious>"}],
  "recommendedAction": "<IMMEDIATE_REVOKE|WAIVER_WITH_MONITORING|ACCEPT_WITH_COMPENSATING|ESCALATE_TO_MANAGEMENT>",
  "compensatingControls": [<string descriptions of recommended compensating controls>],
  "reasoning": "<comprehensive reasoning paragraph>",
  "reasoningSteps": [{"step": <n>, "thought": "<analysis thought>", "conclusion": "<step conclusion>"}]
}

Decision criteria:
- exploitationProbability >= 80 AND isExploited=true → IMMEDIATE_REVOKE
- exploitationProbability >= 50 OR multiple related findings → ESCALATE_TO_MANAGEMENT
- exploitationProbability >= 20 AND compensating controls possible → WAIVER_WITH_MONITORING
- exploitationProbability < 20 AND compensating controls exist → ACCEPT_WITH_COMPENSATING
- When in doubt, ESCALATE_TO_MANAGEMENT

You MUST return valid JSON only. No markdown formatting, no explanation outside the JSON.`;

  const userPrompt = `Analyze this SoD conflict for potential exploitation:

${JSON.stringify(contextPayload, null, 2)}

Provide your complete analysis as JSON.`;

  // Try DeepSeek R1 reasoner first for deep analysis, fall back to standard chat
  let analysisContent: string;
  let tokensFromReasoning = 0;

  try {
    const deepseek = getDeepSeek();
    const reasoningResponse = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: sodSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
    });

    analysisContent = reasoningResponse.choices[0]?.message?.content || "";
    tokensFromReasoning =
      (reasoningResponse.usage?.prompt_tokens || 0) +
      (reasoningResponse.usage?.completion_tokens || 0);
  } catch (reasonerErr) {
    console.warn(
      "[SoD Workflow] DeepSeek R1 unavailable, falling back to standard LLM:",
      reasonerErr instanceof Error ? reasonerErr.message : String(reasonerErr)
    );
    const fallback = await routeLLMRequest(organizationId, {
      systemPrompt: sodSystemPrompt,
      userPrompt,
      maxTokens: 8000,
      temperature: 0.1,
    });
    analysisContent = fallback.content;
    tokensFromReasoning = fallback.inputTokens + fallback.outputTokens;
  }

  totalTokens += tokensFromReasoning;

  // ── Step 4: Parse & Validate ────────────────────────────────
  let analysis: {
    exploitationProbability: number;
    isExploited: boolean;
    exploitationEvidence: string[];
    suspiciousTransactions: { date: string; type: string; amount?: number; reason: string }[];
    recommendedAction: string;
    compensatingControls: string[];
    reasoning: string;
    reasoningSteps: { step: number; thought: string; conclusion: string }[];
  };

  try {
    analysis = parseJSONFromLLM(analysisContent) as typeof analysis;
  } catch {
    // If parsing fails, create a conservative fallback
    analysis = {
      exploitationProbability: 50,
      isExploited: false,
      exploitationEvidence: ["Unable to parse AI analysis — manual review required"],
      suspiciousTransactions: [],
      recommendedAction: "ESCALATE_TO_MANAGEMENT",
      compensatingControls: ["Implement dual-approval workflow", "Enable real-time transaction monitoring"],
      reasoning: `AI analysis could not be parsed. Raw response length: ${analysisContent.length}. Manual review recommended for finding ${findingId}.`,
      reasoningSteps: [
        { step: 1, thought: "AI response parsing failed", conclusion: "Escalating for manual review" },
      ],
    };
  }

  // Clamp exploitation probability
  analysis.exploitationProbability = Math.max(0, Math.min(100, analysis.exploitationProbability));

  // Validate recommended action
  const validActions = [
    "IMMEDIATE_REVOKE",
    "WAIVER_WITH_MONITORING",
    "ACCEPT_WITH_COMPENSATING",
    "ESCALATE_TO_MANAGEMENT",
  ] as const;
  const recommendedAction = validActions.includes(analysis.recommendedAction as typeof validActions[number])
    ? (analysis.recommendedAction as typeof validActions[number])
    : "ESCALATE_TO_MANAGEMENT";

  // ── Step 5: Update Finding ──────────────────────────────────
  const autoRemediate = recommendedAction === "IMMEDIATE_REVOKE" && analysis.exploitationProbability >= 90;

  await db.finding.update({
    where: { id: findingId },
    data: {
      aiAnalysis: JSON.stringify({
        workflow: "sod-analysis",
        result: analysis,
        analyzedAt: new Date().toISOString(),
        tokensUsed: totalTokens,
      }),
      status: autoRemediate ? "IN_PROGRESS" : undefined,
    },
  });

  // Create evidence record for the analysis
  await db.evidence.create({
    data: {
      organizationId,
      findingId,
      type: "SYSTEM_REPORT",
      title: `SoD Deep Analysis — ${primaryUser}`,
      description: `Automated SoD exploitation analysis. Probability: ${analysis.exploitationProbability}%. Action: ${recommendedAction}.`,
      data: {
        workflow: "sod-analysis",
        exploitationProbability: analysis.exploitationProbability,
        isExploited: analysis.isExploited,
        suspiciousTransactionCount: analysis.suspiciousTransactions.length,
        relatedFindingsCount: relatedFindings.length,
        transactionsAnalyzed: transactions.length,
        recommendedAction,
      },
      isAutoCollected: true,
      collectedBy: "system:sod-workflow",
    },
  });

  return {
    findingId,
    userId: primaryUser,
    conflictingRoles,
    exploitationProbability: analysis.exploitationProbability,
    isExploited: analysis.isExploited,
    exploitationEvidence: analysis.exploitationEvidence || [],
    transactionsAnalyzed: transactions.length,
    suspiciousTransactions: analysis.suspiciousTransactions || [],
    recommendedAction,
    compensatingControls: analysis.compensatingControls || [],
    reasoning: analysis.reasoning || "",
    reasoningSteps: analysis.reasoningSteps || [],
    autoRemediationApplied: autoRemediate,
    tokensUsed: totalTokens,
  };
}

// ── Helpers ─────────────────────────────────────────────────

function extractUserId(dataPoints: Record<string, unknown>[]): string {
  for (const dp of dataPoints) {
    const userId =
      dp.userId || dp.user || dp.username || dp.userName || dp.user_id || dp.employeeId;
    if (typeof userId === "string" && userId.length > 0) return userId;
  }
  return "UNKNOWN_USER";
}

function extractConflictingRoles(
  dataPoints: Record<string, unknown>[],
  ruleDefinition: Record<string, unknown> | null
): string[] {
  // Try to get conflicting roles from the rule definition
  if (ruleDefinition) {
    const conditions = ruleDefinition.conditions as Record<string, unknown> | undefined;
    if (conditions?.conflictingRoles) {
      const pairs = conditions.conflictingRoles as string[][];
      // Flatten all conflicting role pairs
      return Array.from(new Set(pairs.flat()));
    }
  }

  // Fall back to extracting roles from data points
  const roles = new Set<string>();
  for (const dp of dataPoints) {
    const dpRoles = (dp.roles || dp.roleAssignments || []) as { role?: string; name?: string }[];
    if (Array.isArray(dpRoles)) {
      for (const r of dpRoles) {
        const roleName = r.role || r.name;
        if (roleName) roles.add(roleName);
      }
    }
  }
  return Array.from(roles);
}
