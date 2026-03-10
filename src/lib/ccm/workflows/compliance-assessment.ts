import { db } from "@/lib/db";
import { routeLLMRequest } from "../llm-router";
import { getDeepSeek } from "@/lib/deepseek";

// ============================================
// COMPLIANCE GAP ASSESSMENT WORKFLOW
// Deep, multi-framework compliance posture analysis
// ============================================

export interface ComplianceAssessmentResult {
  organizationId: string;
  assessmentDate: string;
  overallMaturityLevel: 1 | 2 | 3 | 4 | 5;
  overallMaturityLabel:
    | "INITIAL"
    | "MANAGED"
    | "DEFINED"
    | "QUANTITATIVELY_MANAGED"
    | "OPTIMIZING";
  overallRiskScore: number;
  compliancePosture: "STRONG" | "ADEQUATE" | "NEEDS_IMPROVEMENT" | "CRITICAL";

  frameworkAssessments: {
    framework: string;
    coverage: number;
    maturityLevel: number;
    controlsImplemented: number;
    controlsTotal: number;
    gaps: {
      controlId: string;
      description: string;
      priority: string;
      recommendation: string;
    }[];
    risks: {
      risk: string;
      likelihood: string;
      impact: string;
      mitigation: string;
    }[];
  }[];

  crossFrameworkFindings: string[];
  systemicIssues: {
    issue: string;
    affectedFrameworks: string[];
    rootCause: string;
    recommendation: string;
  }[];

  actionPlan: {
    immediate: { action: string; framework: string; effort: string; impact: string }[];
    thirtyDay: { action: string; framework: string; effort: string; impact: string }[];
    ninetyDay: { action: string; framework: string; effort: string; impact: string }[];
    strategic: { action: string; framework: string; effort: string; impact: string }[];
  };

  tokensUsed: number;
}

function parseJSONFromLLM(content: string): unknown {
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

const MATURITY_LABELS: Record<number, ComplianceAssessmentResult["overallMaturityLabel"]> = {
  1: "INITIAL",
  2: "MANAGED",
  3: "DEFINED",
  4: "QUANTITATIVELY_MANAGED",
  5: "OPTIMIZING",
};

/**
 * Runs a comprehensive compliance gap assessment across all frameworks.
 */
export async function runComplianceAssessment(
  organizationId: string
): Promise<ComplianceAssessmentResult> {
  let totalTokens = 0;
  const assessmentDate = new Date().toISOString();

  // ── Step 1: Data Collection ─────────────────────────────────
  const [
    allFindings,
    allRules,
    recentSyncJobs,
    evidenceCount,
    remediationPlans,
    connectors,
  ] = await Promise.all([
    db.finding.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        framework: true,
        controlId: true,
        createdAt: true,
        resolvedAt: true,
        aiAnalysis: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.monitoringRule.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        framework: true,
        controlId: true,
        domain: true,
        severity: true,
        isActive: true,
        lastRunAt: true,
      },
    }),
    db.connectorSyncJob.findMany({
      where: { connector: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        domain: true,
        status: true,
        recordsPulled: true,
        recordsFailed: true,
        completedAt: true,
      },
    }),
    db.evidence.count({ where: { organizationId } }),
    db.remediationPlan.findMany({
      where: { finding: { organizationId } },
      select: {
        id: true,
        findingId: true,
        steps: true,
        aiGenerated: true,
        approvedBy: true,
        approvedAt: true,
      },
      take: 200,
    }),
    db.eRPConnector.findMany({
      where: { organizationId },
      select: { id: true, erpType: true, isActive: true },
    }),
  ]);

  // ── Step 2: Framework-Level Aggregation ─────────────────────
  const frameworks = Array.from(new Set(allRules.map((r) => r.framework)));
  if (frameworks.length === 0) frameworks.push("CUSTOM");

  const frameworkData = frameworks.map((fw) => {
    const fwRules = allRules.filter((r) => r.framework === fw);
    const fwFindings = allFindings.filter((f) => f.framework === fw);
    const openFindings = fwFindings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS");
    const closedFindings = fwFindings.filter((f) => f.status === "CLOSED" || f.status === "REMEDIATED");
    const activeRules = fwRules.filter((r) => r.isActive);
    const coveredControlsArr = fwRules.filter((r) => r.controlId).map((r) => r.controlId);
    const coveredControls = Array.from(new Set(coveredControlsArr));

    // Calculate mean time to remediate for closed findings
    const remediationTimes = closedFindings
      .filter((f) => f.resolvedAt)
      .map((f) => (f.resolvedAt!.getTime() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const mttr = remediationTimes.length > 0
      ? remediationTimes.reduce((a, b) => a + b, 0) / remediationTimes.length
      : 0;

    return {
      framework: fw,
      rulesTotal: fwRules.length,
      rulesActive: activeRules.length,
      findingsTotal: fwFindings.length,
      findingsOpen: openFindings.length,
      findingsClosed: closedFindings.length,
      criticalOpen: openFindings.filter((f) => f.severity === "CRITICAL").length,
      highOpen: openFindings.filter((f) => f.severity === "HIGH").length,
      coveredControlIds: coveredControls,
      mttrDays: Math.round(mttr * 10) / 10,
      severityDistribution: {
        CRITICAL: fwFindings.filter((f) => f.severity === "CRITICAL").length,
        HIGH: fwFindings.filter((f) => f.severity === "HIGH").length,
        MEDIUM: fwFindings.filter((f) => f.severity === "MEDIUM").length,
        LOW: fwFindings.filter((f) => f.severity === "LOW").length,
      },
    };
  });

  // Overall metrics
  const totalOpen = allFindings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS").length;
  const totalCritical = allFindings.filter((f) => f.severity === "CRITICAL" && (f.status === "OPEN" || f.status === "IN_PROGRESS")).length;
  const syncHealthy = recentSyncJobs.filter((j) => j.status === "COMPLETED").length;
  const syncFailed = recentSyncJobs.filter((j) => j.status === "FAILED").length;

  // ── Step 3: Deep Analysis with LLM ─────────────────────────
  const analysisPayload = {
    organization: {
      id: organizationId,
      connectorsActive: connectors.filter((c) => c.isActive).length,
      erpTypes: connectors.map((c) => c.erpType),
    },
    overallMetrics: {
      totalFindings: allFindings.length,
      openFindings: totalOpen,
      criticalOpenFindings: totalCritical,
      totalRules: allRules.length,
      activeRules: allRules.filter((r) => r.isActive).length,
      evidenceCount,
      remediationPlansTotal: remediationPlans.length,
      remediationPlansApproved: remediationPlans.filter((rp) => rp.approvedAt).length,
      syncJobsRecent: recentSyncJobs.length,
      syncHealthy,
      syncFailed,
    },
    frameworkData,
  };

  const systemPrompt = `You are a senior compliance assessor conducting a comprehensive multi-framework compliance gap assessment. You evaluate organizations against CMM (Capability Maturity Model) levels 1-5 and identify gaps, risks, and remediation priorities.

Framework reference:
- SOX: Sarbanes-Oxley financial controls (ITGC, access, change management, SoD)
- PCI_DSS: Payment Card Industry Data Security Standard (12 requirements)
- HIPAA: Health Insurance Portability (Privacy, Security, Breach Notification rules)
- AML_BSA: Anti-Money Laundering / Bank Secrecy Act (CDD, SAR, CTR)
- GDPR: General Data Protection Regulation (lawful basis, DPIA, breach, DPO)
- ISO_27001: Information Security Management System (Annex A controls)
- NIST_CSF: NIST Cybersecurity Framework (Identify, Protect, Detect, Respond, Recover)

CMM Maturity Levels:
1 = INITIAL: Ad hoc, reactive. No formal processes.
2 = MANAGED: Basic processes defined but inconsistent.
3 = DEFINED: Standardized processes documented and followed.
4 = QUANTITATIVELY_MANAGED: Metrics-driven, measured performance.
5 = OPTIMIZING: Continuous improvement, automated controls.

You MUST return valid JSON only with this structure:
{
  "overallMaturityLevel": <1-5>,
  "overallRiskScore": <0-100>,
  "compliancePosture": "<STRONG|ADEQUATE|NEEDS_IMPROVEMENT|CRITICAL>",
  "frameworkAssessments": [
    {
      "framework": "<name>",
      "coverage": <0-100>,
      "maturityLevel": <1-5>,
      "controlsImplemented": <number>,
      "controlsTotal": <number>,
      "gaps": [{"controlId": "<id>", "description": "<desc>", "priority": "<HIGH|MEDIUM|LOW>", "recommendation": "<rec>"}],
      "risks": [{"risk": "<risk>", "likelihood": "<HIGH|MEDIUM|LOW>", "impact": "<HIGH|MEDIUM|LOW>", "mitigation": "<mitigation>"}]
    }
  ],
  "crossFrameworkFindings": ["<finding across multiple frameworks>"],
  "systemicIssues": [{"issue": "<issue>", "affectedFrameworks": ["<fw>"], "rootCause": "<cause>", "recommendation": "<rec>"}],
  "actionPlan": {
    "immediate": [{"action": "<action>", "framework": "<fw>", "effort": "<LOW|MEDIUM|HIGH>", "impact": "<LOW|MEDIUM|HIGH>"}],
    "thirtyDay": [{"action": "<action>", "framework": "<fw>", "effort": "<LOW|MEDIUM|HIGH>", "impact": "<LOW|MEDIUM|HIGH>"}],
    "ninetyDay": [{"action": "<action>", "framework": "<fw>", "effort": "<LOW|MEDIUM|HIGH>", "impact": "<LOW|MEDIUM|HIGH>"}],
    "strategic": [{"action": "<action>", "framework": "<fw>", "effort": "<LOW|MEDIUM|HIGH>", "impact": "<LOW|MEDIUM|HIGH>"}]
  }
}`;

  const userPrompt = `Conduct a comprehensive compliance gap assessment based on this organizational data:

${JSON.stringify(analysisPayload, null, 2)}

Evaluate each framework's maturity, identify gaps and risks, find cross-framework issues, and produce a prioritized action plan. Return JSON only.`;

  // Use DeepSeek R1 for reasoning depth, fall back to standard router
  let analysisContent: string;
  try {
    const deepseek = getDeepSeek();
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 12000,
    });
    analysisContent = resp.choices[0]?.message?.content || "";
    totalTokens += (resp.usage?.prompt_tokens || 0) + (resp.usage?.completion_tokens || 0);
  } catch {
    const fallback = await routeLLMRequest(organizationId, {
      systemPrompt,
      userPrompt,
      maxTokens: 12000,
      temperature: 0.15,
    });
    analysisContent = fallback.content;
    totalTokens += fallback.inputTokens + fallback.outputTokens;
  }

  // ── Step 4: Parse & Build Result ────────────────────────────
  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSONFromLLM(analysisContent) as Record<string, unknown>;
  } catch {
    // Conservative fallback
    parsed = buildFallbackAssessment(frameworkData, totalOpen, totalCritical);
  }

  const overallMaturity = clamp(Number(parsed.overallMaturityLevel) || 2, 1, 5) as 1 | 2 | 3 | 4 | 5;
  const overallRisk = clamp(Number(parsed.overallRiskScore) || 50, 0, 100);

  const postureValues = ["STRONG", "ADEQUATE", "NEEDS_IMPROVEMENT", "CRITICAL"] as const;
  const compliancePosture = postureValues.includes(parsed.compliancePosture as typeof postureValues[number])
    ? (parsed.compliancePosture as typeof postureValues[number])
    : derivePosture(overallRisk);

  const frameworkAssessments = Array.isArray(parsed.frameworkAssessments)
    ? (parsed.frameworkAssessments as ComplianceAssessmentResult["frameworkAssessments"])
    : [];

  const actionPlan = (parsed.actionPlan || { immediate: [], thirtyDay: [], ninetyDay: [], strategic: [] }) as ComplianceAssessmentResult["actionPlan"];

  // ── Step 5: Persist Report ──────────────────────────────────
  await db.cCMReport.create({
    data: {
      organizationId,
      reportType: "COMPLIANCE_ASSESSMENT",
      title: `Compliance Gap Assessment — ${new Date().toLocaleDateString()}`,
      generatedBy: "system:compliance-assessment-workflow",
      data: {
        overallMaturityLevel: overallMaturity,
        overallRiskScore: overallRisk,
        compliancePosture,
        frameworkAssessments,
        actionPlan,
      },
      aiResponse: analysisContent.slice(0, 50000),
      tokensUsed: totalTokens,
      costUsd: totalTokens * 0.000002, // Rough estimate
    },
  });

  return {
    organizationId,
    assessmentDate,
    overallMaturityLevel: overallMaturity,
    overallMaturityLabel: MATURITY_LABELS[overallMaturity],
    overallRiskScore: overallRisk,
    compliancePosture,
    frameworkAssessments,
    crossFrameworkFindings: Array.isArray(parsed.crossFrameworkFindings)
      ? (parsed.crossFrameworkFindings as string[])
      : [],
    systemicIssues: Array.isArray(parsed.systemicIssues)
      ? (parsed.systemicIssues as ComplianceAssessmentResult["systemicIssues"])
      : [],
    actionPlan,
    tokensUsed: totalTokens,
  };
}

// ── Helpers ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function derivePosture(riskScore: number): ComplianceAssessmentResult["compliancePosture"] {
  if (riskScore <= 25) return "STRONG";
  if (riskScore <= 50) return "ADEQUATE";
  if (riskScore <= 75) return "NEEDS_IMPROVEMENT";
  return "CRITICAL";
}

function buildFallbackAssessment(
  frameworkData: { framework: string; findingsOpen: number; criticalOpen: number; rulesActive: number }[],
  totalOpen: number,
  totalCritical: number
): Record<string, unknown> {
  const riskScore = Math.min(100, totalCritical * 15 + totalOpen * 3);
  return {
    overallMaturityLevel: riskScore > 60 ? 1 : riskScore > 30 ? 2 : 3,
    overallRiskScore: riskScore,
    compliancePosture: derivePosture(riskScore),
    frameworkAssessments: frameworkData.map((fw) => ({
      framework: fw.framework,
      coverage: fw.rulesActive > 0 ? Math.min(100, fw.rulesActive * 10) : 0,
      maturityLevel: fw.criticalOpen > 0 ? 1 : fw.findingsOpen > 3 ? 2 : 3,
      controlsImplemented: fw.rulesActive,
      controlsTotal: fw.rulesActive + fw.findingsOpen,
      gaps: [{ controlId: "UNKNOWN", description: "AI analysis unavailable — manual review needed", priority: "HIGH", recommendation: "Conduct manual framework gap assessment" }],
      risks: [],
    })),
    crossFrameworkFindings: ["AI analysis unavailable — unable to identify cross-framework issues"],
    systemicIssues: [],
    actionPlan: {
      immediate: totalCritical > 0
        ? [{ action: `Address ${totalCritical} critical open findings`, framework: "ALL", effort: "HIGH", impact: "HIGH" }]
        : [],
      thirtyDay: [{ action: "Complete manual compliance gap assessment", framework: "ALL", effort: "HIGH", impact: "HIGH" }],
      ninetyDay: [],
      strategic: [],
    },
  };
}
