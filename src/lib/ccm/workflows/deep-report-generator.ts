import { db } from "@/lib/db";
import { routeLLMRequest } from "../llm-router";
import { getDeepSeek } from "@/lib/deepseek";

// ============================================
// DEEP REPORT GENERATOR WORKFLOW
// Reasoning-powered audit-grade report generation
// ============================================

export interface DeepReportResult {
  reportId: string;
  reportType: string;

  executiveSummary: {
    overallPosture: string;
    riskScore: number;
    criticalFindings: number;
    trendsummary: string;
    topRecommendation: string;
  };

  detailedFindings: {
    finding: string;
    severity: string;
    rootCause: string;
    businessImpact: string;
    recommendation: string;
    evidence: string[];
  }[];

  riskAnalysis: {
    inherentRisk: number;
    residualRisk: number;
    riskTrend: "IMPROVING" | "STABLE" | "DETERIORATING";
    topRisks: { risk: string; score: number; mitigation: string }[];
  };

  complianceMetrics: {
    framework: string;
    coverage: number;
    findingsOpen: number;
    findingsClosed: number;
    mttr: number;
  }[];

  recommendations: {
    priority: "IMMEDIATE" | "SHORT_TERM" | "LONG_TERM";
    action: string;
    owner: string;
    framework: string;
    estimatedEffort: string;
    expectedImpact: string;
  }[];

  narrative: string;
  tokensUsed: number;
}

function parseJSONFromLLM(content: string): unknown {
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * Generates a comprehensive, audit-grade compliance report using deep reasoning.
 *
 * Steps:
 * 1. Aggregate data across findings, rules, syncs, evidence
 * 2. Use reasoning LLM to analyze trends and systemic issues
 * 3. Benchmark against framework requirements
 * 4. Generate professional narrative with executive summary
 * 5. Calculate risk scores with justification
 * 6. Auto-generate prioritized action items
 */
export async function generateDeepReport(
  organizationId: string,
  options: {
    reportType: string;
    dateFrom?: Date;
    dateTo?: Date;
    frameworks?: string[];
  }
): Promise<DeepReportResult> {
  let totalTokens = 0;
  const { reportType, dateFrom, dateTo, frameworks } = options;
  const effectiveFrom = dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const effectiveTo = dateTo || new Date();

  // ── Step 1: Comprehensive Data Aggregation ──────────────────
  const dateFilter = { gte: effectiveFrom, lte: effectiveTo };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frameworkFilter = frameworks && frameworks.length > 0
    ? { in: frameworks as any[] }
    : undefined;

  const [
    findings,
    rules,
    evidence,
    syncJobs,
    remediationPlans,
    connectors,
    orgMembers,
  ] = await Promise.all([
    db.finding.findMany({
      where: {
        organizationId,
        createdAt: dateFilter,
        ...(frameworkFilter ? { framework: { in: frameworkFilter.in } as any } : {}),
      },
      include: {
        rule: { select: { name: true, framework: true, controlId: true, domain: true } },
        evidence: { select: { id: true, type: true, title: true } },
        remediationPlan: { select: { id: true, approvedAt: true, steps: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.monitoringRule.findMany({
      where: {
        organizationId,
        ...(frameworkFilter ? { framework: { in: frameworkFilter.in } as any } : {}),
      },
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
    db.evidence.findMany({
      where: { organizationId, collectedAt: dateFilter },
      select: { id: true, type: true, title: true, findingId: true, isAutoCollected: true, collectedAt: true },
      take: 500,
    }),
    db.connectorSyncJob.findMany({
      where: { connector: { organizationId }, createdAt: dateFilter },
      select: { id: true, domain: true, status: true, recordsPulled: true, recordsFailed: true, completedAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.remediationPlan.findMany({
      where: { finding: { organizationId, createdAt: dateFilter } },
      select: { id: true, findingId: true, aiGenerated: true, approvedAt: true, tokensUsed: true },
    }),
    db.eRPConnector.findMany({
      where: { organizationId },
      select: { id: true, erpType: true, isActive: true, lastSyncAt: true },
    }),
    db.cCMOrganizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { name: true, email: true } } },
      take: 50,
    }),
  ]);

  // ── Step 2: Compute Metrics ─────────────────────────────────
  const activeFrameworks = Array.from(new Set(rules.map((r) => r.framework)));

  const frameworkMetrics = activeFrameworks.map((fw) => {
    const fwFindings = findings.filter((f) => f.rule?.framework === fw || (f as Record<string, unknown>).framework === fw);
    const openFindings = fwFindings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS");
    const closedFindings = fwFindings.filter((f) => f.status === "CLOSED" || f.status === "REMEDIATED");
    const fwRules = rules.filter((r) => r.framework === fw);

    // Mean time to remediate
    const remTimes = closedFindings
      .filter((f) => f.resolvedAt)
      .map((f) => (f.resolvedAt!.getTime() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const mttr = remTimes.length > 0 ? Math.round(remTimes.reduce((a, b) => a + b, 0) / remTimes.length) : 0;

    return {
      framework: fw,
      rulesActive: fwRules.filter((r) => r.isActive).length,
      rulesTotal: fwRules.length,
      findingsTotal: fwFindings.length,
      findingsOpen: openFindings.length,
      findingsClosed: closedFindings.length,
      criticalOpen: openFindings.filter((f) => f.severity === "CRITICAL").length,
      highOpen: openFindings.filter((f) => f.severity === "HIGH").length,
      mttrDays: mttr,
      coverageEstimate: fwRules.filter((r) => r.isActive).length > 0
        ? Math.min(100, fwRules.filter((r) => r.isActive && r.lastRunAt).length * 15)
        : 0,
      severityBreakdown: {
        CRITICAL: fwFindings.filter((f) => f.severity === "CRITICAL").length,
        HIGH: fwFindings.filter((f) => f.severity === "HIGH").length,
        MEDIUM: fwFindings.filter((f) => f.severity === "MEDIUM").length,
        LOW: fwFindings.filter((f) => f.severity === "LOW").length,
      },
    };
  });

  // Trend analysis: compare first half vs second half of the period
  const midpoint = new Date((effectiveFrom.getTime() + effectiveTo.getTime()) / 2);
  const firstHalfFindings = findings.filter((f) => f.createdAt < midpoint).length;
  const secondHalfFindings = findings.filter((f) => f.createdAt >= midpoint).length;
  const trendDirection = secondHalfFindings > firstHalfFindings * 1.2
    ? "DETERIORATING"
    : secondHalfFindings < firstHalfFindings * 0.8
      ? "IMPROVING"
      : "STABLE";

  const totalCriticalOpen = findings.filter((f) => f.severity === "CRITICAL" && (f.status === "OPEN" || f.status === "IN_PROGRESS")).length;
  const totalOpen = findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS").length;

  // Sync health
  const syncCompleted = syncJobs.filter((j) => j.status === "COMPLETED").length;
  const syncFailed = syncJobs.filter((j) => j.status === "FAILED").length;

  // ── Step 3: Deep Analysis with Reasoning LLM ───────────────
  const reportPayload = {
    reportType,
    period: { from: effectiveFrom.toISOString(), to: effectiveTo.toISOString() },
    organization: {
      connectors: connectors.map((c) => ({ type: c.erpType, active: c.isActive })),
      memberCount: orgMembers.length,
    },
    overallMetrics: {
      totalFindings: findings.length,
      openFindings: totalOpen,
      criticalOpen: totalCriticalOpen,
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      evidenceCount: evidence.length,
      autoCollectedEvidence: evidence.filter((e) => e.isAutoCollected).length,
      remediationPlansTotal: remediationPlans.length,
      remediationPlansApproved: remediationPlans.filter((rp) => rp.approvedAt).length,
      syncJobsCompleted: syncCompleted,
      syncJobsFailed: syncFailed,
      trend: trendDirection,
      firstHalfFindings,
      secondHalfFindings,
    },
    frameworkMetrics,
    topFindings: findings
      .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        framework: f.rule?.framework || "CUSTOM",
        controlId: f.rule?.controlId || null,
        hasRemediation: !!f.remediationPlan,
        remediationApproved: !!f.remediationPlan?.approvedAt,
        evidenceCount: f.evidence.length,
        createdAt: f.createdAt.toISOString(),
        resolvedAt: f.resolvedAt?.toISOString() || null,
      })),
  };

  const systemPrompt = `You are a senior compliance auditor generating an audit-grade compliance report. Your reports are used by boards, regulators, and executive leadership.

You must produce a comprehensive analysis with:
1. Executive summary with clear posture assessment
2. Detailed root cause analysis for each significant finding
3. Business impact assessment
4. Risk scoring with trend analysis
5. Prioritized recommendations with ownership

Return valid JSON with this structure:
{
  "executiveSummary": {
    "overallPosture": "<1-2 sentence posture statement>",
    "riskScore": <0-100>,
    "criticalFindings": <number>,
    "trendsummary": "<trend analysis>",
    "topRecommendation": "<single most important recommendation>"
  },
  "detailedFindings": [
    {
      "finding": "<finding title/description>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "rootCause": "<root cause analysis>",
      "businessImpact": "<business impact statement>",
      "recommendation": "<specific recommendation>",
      "evidence": ["<evidence supporting analysis>"]
    }
  ],
  "riskAnalysis": {
    "inherentRisk": <0-100>,
    "residualRisk": <0-100>,
    "riskTrend": "<IMPROVING|STABLE|DETERIORATING>",
    "topRisks": [{"risk": "<risk>", "score": <0-100>, "mitigation": "<mitigation>"}]
  },
  "complianceMetrics": [
    {
      "framework": "<framework name>",
      "coverage": <0-100>,
      "findingsOpen": <number>,
      "findingsClosed": <number>,
      "mttr": <days>
    }
  ],
  "recommendations": [
    {
      "priority": "<IMMEDIATE|SHORT_TERM|LONG_TERM>",
      "action": "<specific action>",
      "owner": "<recommended owner role>",
      "framework": "<related framework>",
      "estimatedEffort": "<LOW|MEDIUM|HIGH>",
      "expectedImpact": "<description of expected impact>"
    }
  ],
  "narrative": "<Full markdown report narrative suitable for board/regulator presentation. Include sections: Executive Summary, Scope, Methodology, Findings, Risk Assessment, Recommendations, Conclusion. Use professional language. 800-2000 words.>"
}

Scoring guidelines:
- riskScore > 75: CRITICAL state — immediate board attention needed
- riskScore 50-75: Significant concerns requiring management action
- riskScore 25-50: Moderate risk, improvement needed
- riskScore < 25: Low risk, maintain current controls
- inherentRisk = risk without ANY controls
- residualRisk = risk WITH current controls in place`;

  const userPrompt = `Generate a comprehensive ${reportType} compliance report based on this data:

${JSON.stringify(reportPayload, null, 2)}

Provide thorough analysis and a professional narrative suitable for regulatory submission. Return JSON only.`;

  let analysisContent: string;
  try {
    const deepseek = getDeepSeek();
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 16000,
    });
    analysisContent = resp.choices[0]?.message?.content || "";
    totalTokens += (resp.usage?.prompt_tokens || 0) + (resp.usage?.completion_tokens || 0);
  } catch {
    const fallback = await routeLLMRequest(organizationId, {
      systemPrompt,
      userPrompt,
      maxTokens: 12000,
      temperature: 0.2,
    });
    analysisContent = fallback.content;
    totalTokens += fallback.inputTokens + fallback.outputTokens;
  }

  // ── Step 4: Parse Response ──────────────────────────────────
  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSONFromLLM(analysisContent) as Record<string, unknown>;
  } catch {
    parsed = buildFallbackReport(reportPayload, frameworkMetrics, trendDirection, totalCriticalOpen, totalOpen);
  }

  // Extract and validate sections
  const executiveSummary = (parsed.executiveSummary || {}) as DeepReportResult["executiveSummary"];
  executiveSummary.riskScore = clamp(executiveSummary.riskScore || 50, 0, 100);
  executiveSummary.criticalFindings = executiveSummary.criticalFindings ?? totalCriticalOpen;

  const detailedFindings = Array.isArray(parsed.detailedFindings)
    ? (parsed.detailedFindings as DeepReportResult["detailedFindings"])
    : [];

  const riskAnalysis = (parsed.riskAnalysis || {
    inherentRisk: 70,
    residualRisk: executiveSummary.riskScore,
    riskTrend: trendDirection,
    topRisks: [],
  }) as DeepReportResult["riskAnalysis"];
  riskAnalysis.inherentRisk = clamp(riskAnalysis.inherentRisk, 0, 100);
  riskAnalysis.residualRisk = clamp(riskAnalysis.residualRisk, 0, 100);
  const validTrends = ["IMPROVING", "STABLE", "DETERIORATING"] as const;
  if (!validTrends.includes(riskAnalysis.riskTrend)) {
    riskAnalysis.riskTrend = trendDirection as typeof riskAnalysis.riskTrend;
  }

  const complianceMetrics = Array.isArray(parsed.complianceMetrics)
    ? (parsed.complianceMetrics as DeepReportResult["complianceMetrics"])
    : frameworkMetrics.map((fm) => ({
        framework: fm.framework,
        coverage: fm.coverageEstimate,
        findingsOpen: fm.findingsOpen,
        findingsClosed: fm.findingsClosed,
        mttr: fm.mttrDays,
      }));

  const recommendations = Array.isArray(parsed.recommendations)
    ? (parsed.recommendations as DeepReportResult["recommendations"])
    : [];

  const narrative = typeof parsed.narrative === "string" ? parsed.narrative : generateFallbackNarrative(
    reportType, executiveSummary, frameworkMetrics, totalOpen, totalCriticalOpen
  );

  // ── Step 5: Persist Report ──────────────────────────────────
  const report = await db.cCMReport.create({
    data: {
      organizationId,
      reportType,
      title: `${reportType} Report — ${effectiveFrom.toLocaleDateString()} to ${effectiveTo.toLocaleDateString()}`,
      generatedBy: "system:deep-report-generator",
      data: {
        executiveSummary,
        detailedFindings,
        riskAnalysis,
        complianceMetrics,
        recommendations,
        period: { from: effectiveFrom.toISOString(), to: effectiveTo.toISOString() },
      },
      aiResponse: narrative.slice(0, 50000),
      tokensUsed: totalTokens,
      costUsd: totalTokens * 0.000002,
    },
  });

  return {
    reportId: report.id,
    reportType,
    executiveSummary,
    detailedFindings,
    riskAnalysis,
    complianceMetrics,
    recommendations,
    narrative,
    tokensUsed: totalTokens,
  };
}

// ── Helpers ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildFallbackReport(
  payload: Record<string, unknown>,
  frameworkMetrics: { framework: string; findingsOpen: number; findingsClosed: number; mttrDays: number; coverageEstimate: number; criticalOpen: number }[],
  trendDirection: string,
  criticalOpen: number,
  totalOpen: number
): Record<string, unknown> {
  const riskScore = Math.min(100, criticalOpen * 15 + totalOpen * 3);
  return {
    executiveSummary: {
      overallPosture: riskScore > 60
        ? "Organization faces significant compliance risks requiring immediate attention."
        : "Organization maintains adequate compliance posture with areas for improvement.",
      riskScore,
      criticalFindings: criticalOpen,
      trendsummary: `Finding trend is ${trendDirection.toLowerCase()} over the reporting period.`,
      topRecommendation: criticalOpen > 0
        ? "Address critical findings immediately to reduce regulatory exposure."
        : "Continue monitoring and improving control coverage.",
    },
    detailedFindings: [],
    riskAnalysis: {
      inherentRisk: Math.min(100, riskScore + 20),
      residualRisk: riskScore,
      riskTrend: trendDirection,
      topRisks: [],
    },
    complianceMetrics: frameworkMetrics.map((fm) => ({
      framework: fm.framework,
      coverage: fm.coverageEstimate,
      findingsOpen: fm.findingsOpen,
      findingsClosed: fm.findingsClosed,
      mttr: fm.mttrDays,
    })),
    recommendations: criticalOpen > 0
      ? [{ priority: "IMMEDIATE", action: `Remediate ${criticalOpen} critical findings`, owner: "Compliance Team", framework: "ALL", estimatedEffort: "HIGH", expectedImpact: "Significant risk reduction" }]
      : [],
    narrative: "AI analysis unavailable. Please review the data manually.",
  };
}

function generateFallbackNarrative(
  reportType: string,
  summary: DeepReportResult["executiveSummary"],
  frameworks: { framework: string; findingsOpen: number; findingsClosed: number }[],
  totalOpen: number,
  totalCritical: number
): string {
  const frameworkList = frameworks.map((f) => `- **${f.framework}**: ${f.findingsOpen} open, ${f.findingsClosed} closed`).join("\n");
  return `# ${reportType} Compliance Report

## Executive Summary

${summary.overallPosture}

**Risk Score:** ${summary.riskScore}/100
**Critical Findings:** ${totalCritical}
**Total Open Findings:** ${totalOpen}

## Framework Summary

${frameworkList}

## Trend Analysis

${summary.trendsummary}

## Top Recommendation

${summary.topRecommendation}

---
*Report generated automatically. AI-powered deep analysis was unavailable — narrative may be incomplete.*
`;
}
