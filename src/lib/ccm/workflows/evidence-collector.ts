import { db } from "@/lib/db";
import { routeLLMRequest } from "../llm-router";

// ============================================
// EVIDENCE COLLECTOR WORKFLOW
// Automatic evidence gathering from ERP data
// ============================================

export interface EvidenceCollectionResult {
  findingId: string;
  evidenceCollected: number;
  evidenceTypes: string[];
  autoCollected: boolean;
  summary: string;
  tokensUsed: number;
}

function parseJSONFromLLM(content: string): unknown {
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * Maps finding types and frameworks to evidence categories needed.
 */
const EVIDENCE_REQUIREMENTS: Record<string, string[]> = {
  SOX: ["access_log", "change_log", "approval_record", "configuration", "transaction", "journal_entry", "role_assignment"],
  PCI_DSS: ["access_log", "configuration", "vulnerability_scan", "encryption_config", "network_config", "policy_document"],
  HIPAA: ["access_log", "phi_access_record", "policy_document", "training_record", "risk_assessment", "incident_record"],
  AML_BSA: ["transaction", "customer_record", "screening_result", "sar_filing", "cdd_record", "alert_record"],
  GDPR: ["consent_record", "dpia", "data_processing_record", "access_log", "breach_notification", "retention_record"],
  ISO_27001: ["access_log", "configuration", "incident_record", "risk_assessment", "policy_document", "audit_trail"],
  NIST_CSF: ["access_log", "vulnerability_scan", "incident_record", "backup_record", "configuration", "recovery_test"],
  CUSTOM: ["access_log", "configuration", "transaction", "change_log"],
};

/**
 * Collects evidence for a specific finding by pulling relevant ERP data,
 * packaging it, and generating an AI summary.
 */
export async function collectEvidence(
  organizationId: string,
  findingId: string
): Promise<EvidenceCollectionResult> {
  let totalTokens = 0;

  // ── Step 1: Load Finding & Identify Evidence Needs ──────────
  const finding = await db.finding.findFirst({
    where: { id: findingId, organizationId },
    include: {
      rule: true,
      dataPoints: { include: { dataPoint: true } },
      evidence: { select: { id: true, type: true, title: true } },
    },
  });

  if (!finding) {
    throw new Error(`Finding ${findingId} not found in organization ${organizationId}`);
  }

  const framework = finding.framework || "CUSTOM";
  const neededTypes = EVIDENCE_REQUIREMENTS[framework] || EVIDENCE_REQUIREMENTS.CUSTOM;

  // Determine the time range for evidence collection
  const findingDate = finding.createdAt;
  const lookbackDays = finding.severity === "CRITICAL" ? 90 : finding.severity === "HIGH" ? 60 : 30;
  const evidenceFrom = new Date(findingDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const evidenceTo = new Date(); // Up to now

  // ── Step 2: Pull ERP Data ───────────────────────────────────
  // Get data points relevant to the finding's domain and time window
  const domain = finding.rule?.domain || "ALL";

  const erpDataPoints = await db.eRPDataPoint.findMany({
    where: {
      connector: { organizationId },
      domain: domain === "ALL" ? undefined : domain,
      pulledAt: { gte: evidenceFrom, lte: evidenceTo },
      dataType: { in: neededTypes },
    },
    orderBy: { pulledAt: "desc" },
    take: 200,
  });

  // Also pull data points directly linked to the finding
  const linkedDataPoints = finding.dataPoints.map((fdp) => fdp.dataPoint);

  // Merge and deduplicate
  const allDataPointIds = new Set<string>();
  const allDataPoints: typeof erpDataPoints = [];
  for (const dp of [...linkedDataPoints, ...erpDataPoints]) {
    if (!allDataPointIds.has(dp.id)) {
      allDataPointIds.add(dp.id);
      allDataPoints.push(dp);
    }
  }

  if (allDataPoints.length === 0) {
    return {
      findingId,
      evidenceCollected: 0,
      evidenceTypes: [],
      autoCollected: true,
      summary: "No ERP data points found matching the evidence requirements for this finding.",
      tokensUsed: 0,
    };
  }

  // ── Step 3: Group by Type & Package ─────────────────────────
  const groupedByType = new Map<string, typeof erpDataPoints>();
  for (const dp of allDataPoints) {
    const existing = groupedByType.get(dp.dataType) || [];
    existing.push(dp);
    groupedByType.set(dp.dataType, existing);
  }

  // ── Step 4: AI Summary & Relevance Assessment ───────────────
  const evidencePackages: {
    type: string;
    count: number;
    dateRange: { from: string; to: string };
    samples: Record<string, unknown>[];
    flaggedCount: number;
  }[] = [];

  for (const [dataType, points] of Array.from(groupedByType.entries())) {
    const dates = points.map((p) => p.pulledAt.getTime()).sort();
    const flaggedCount = points.filter((p) => p.flagged).length;
    evidencePackages.push({
      type: dataType,
      count: points.length,
      dateRange: {
        from: new Date(dates[0]).toISOString(),
        to: new Date(dates[dates.length - 1]).toISOString(),
      },
      samples: points.slice(0, 10).map((p) => ({
        id: p.id,
        data: p.data,
        flagged: p.flagged,
        severity: p.severity,
        date: p.dataDate?.toISOString() || p.pulledAt.toISOString(),
      })),
      flaggedCount,
    });
  }

  const summaryPrompt = `You are a compliance evidence analyst. Analyze the following evidence packages collected for a compliance finding and provide:
1. A relevance assessment for each evidence type
2. Key observations from the data
3. Whether the evidence supports, contradicts, or is neutral regarding the finding
4. Gaps in evidence that should be addressed

Finding:
- Title: ${finding.title}
- Description: ${finding.description}
- Severity: ${finding.severity}
- Framework: ${framework}
- Control ID: ${finding.controlId || "N/A"}

Evidence Packages:
${JSON.stringify(evidencePackages, null, 2)}

Return JSON:
{
  "overallSummary": "<2-3 sentence summary of evidence quality and completeness>",
  "evidenceAssessments": [
    {
      "type": "<evidence type>",
      "relevance": "<HIGH|MEDIUM|LOW>",
      "observation": "<key observation>",
      "supports": "<SUPPORTS|CONTRADICTS|NEUTRAL>",
      "recommendation": "<next step for this evidence>"
    }
  ],
  "gaps": ["<missing evidence type or data>"],
  "confidenceLevel": "<HIGH|MEDIUM|LOW>",
  "keyFindings": ["<important finding from evidence>"]
}`;

  const llmResponse = await routeLLMRequest(organizationId, {
    systemPrompt: "You are a compliance evidence assessment specialist. Return valid JSON only.",
    userPrompt: summaryPrompt,
    maxTokens: 4000,
    temperature: 0.15,
  });
  totalTokens += llmResponse.inputTokens + llmResponse.outputTokens;

  let aiAssessment: {
    overallSummary: string;
    evidenceAssessments: { type: string; relevance: string; observation: string; supports: string; recommendation: string }[];
    gaps: string[];
    confidenceLevel: string;
    keyFindings: string[];
  };

  try {
    aiAssessment = parseJSONFromLLM(llmResponse.content) as typeof aiAssessment;
  } catch {
    aiAssessment = {
      overallSummary: `Collected ${allDataPoints.length} data points across ${groupedByType.size} evidence types for finding "${finding.title}".`,
      evidenceAssessments: [],
      gaps: [],
      confidenceLevel: "LOW",
      keyFindings: [],
    };
  }

  // ── Step 5: Create Evidence Records ─────────────────────────
  let evidenceCreatedCount = 0;
  const evidenceTypesCreated: string[] = [];

  for (const [dataType, points] of Array.from(groupedByType.entries())) {
    // Check if we already have auto-collected evidence of this type for this finding
    const existingEvidence = finding.evidence.find(
      (e) => e.type === "AUTO_COLLECTED" && e.title.includes(dataType)
    );
    if (existingEvidence) continue;

    const assessment = aiAssessment.evidenceAssessments?.find((a) => a.type === dataType);
    const flaggedPoints = points.filter((p) => p.flagged);

    await db.evidence.create({
      data: {
        organizationId,
        findingId,
        type: "AUTO_COLLECTED",
        title: `${dataType} Evidence Package (${points.length} records)`,
        description: assessment
          ? `${assessment.observation} Relevance: ${assessment.relevance}. ${assessment.supports} the finding.`
          : `Auto-collected ${points.length} ${dataType} records from ERP data.`,
        data: {
          dataType,
          recordCount: points.length,
          flaggedCount: flaggedPoints.length,
          dateRange: {
            from: evidenceFrom.toISOString(),
            to: evidenceTo.toISOString(),
          },
          relevance: assessment?.relevance || "MEDIUM",
          supports: assessment?.supports || "NEUTRAL",
          sampleIds: points.slice(0, 20).map((p) => p.id),
          recommendation: assessment?.recommendation || null,
        },
        isAutoCollected: true,
        collectedBy: "system:evidence-collector",
      },
    });

    evidenceCreatedCount++;
    evidenceTypesCreated.push(dataType);
  }

  // Create a summary evidence record
  if (evidenceCreatedCount > 0) {
    await db.evidence.create({
      data: {
        organizationId,
        findingId,
        type: "SYSTEM_REPORT",
        title: `Evidence Collection Summary — ${new Date().toLocaleDateString()}`,
        description: aiAssessment.overallSummary,
        data: {
          collectedAt: new Date().toISOString(),
          totalRecords: allDataPoints.length,
          evidenceTypes: evidenceTypesCreated,
          gaps: aiAssessment.gaps || [],
          confidenceLevel: aiAssessment.confidenceLevel || "MEDIUM",
          keyFindings: aiAssessment.keyFindings || [],
          tokensUsed: totalTokens,
        },
        isAutoCollected: true,
        collectedBy: "system:evidence-collector",
      },
    });
    evidenceCreatedCount++;
  }

  return {
    findingId,
    evidenceCollected: evidenceCreatedCount,
    evidenceTypes: evidenceTypesCreated,
    autoCollected: true,
    summary: aiAssessment.overallSummary || `Collected ${evidenceCreatedCount} evidence packages.`,
    tokensUsed: totalTokens,
  };
}

/**
 * Bulk evidence collection for all open findings in an organization.
 */
export async function collectEvidenceForOpenFindings(
  organizationId: string,
  limit?: number
): Promise<{ processed: number; evidenceCreated: number; errors: string[] }> {
  const openFindings = await db.finding.findMany({
    where: {
      organizationId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { id: true },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }], // CRITICAL first
    take: limit || 50,
  });

  let processed = 0;
  let totalEvidenceCreated = 0;
  const errors: string[] = [];

  for (const finding of openFindings) {
    try {
      const result = await collectEvidence(organizationId, finding.id);
      processed++;
      totalEvidenceCreated += result.evidenceCollected;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Finding ${finding.id}: ${message}`);
    }
  }

  return {
    processed,
    evidenceCreated: totalEvidenceCreated,
    errors,
  };
}
