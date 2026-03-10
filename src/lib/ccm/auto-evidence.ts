import { db } from "@/lib/db";
import { routeLLMRequest } from "@/lib/ccm/llm-router";

// ============================================
// AUTO-EVIDENCE COLLECTION ENGINE
// ============================================

export interface AutoEvidenceResult {
  findingId: string;
  evidenceCollected: number;
  types: string[];
  summary: string;
}

// Map compliance domains to relevant evidence types
const DOMAIN_EVIDENCE_MAP: Record<string, string[]> = {
  SOX_CONTROLS: [
    "CHANGE_LOG",
    "APPROVAL_TRAIL",
    "TRANSACTION_RECORD",
    "SYSTEM_CONFIG",
  ],
  ACCESS_CONTROL: [
    "USER_ACCESS_LISTING",
    "ACCESS_SNAPSHOT",
    "CHANGE_LOG",
  ],
  AUDIT_TRAIL: [
    "CHANGE_LOG",
    "TRANSACTION_RECORD",
    "APPROVAL_TRAIL",
  ],
  AML_KYC: [
    "TRANSACTION_RECORD",
    "ACCESS_SNAPSHOT",
    "APPROVAL_TRAIL",
  ],
};

// Map evidence type labels to data types in ERPDataPoint
const EVIDENCE_TYPE_DATA_MAP: Record<string, string[]> = {
  CHANGE_LOG: ["change_log", "change_document"],
  ACCESS_SNAPSHOT: ["user_access", "role_assignment"],
  TRANSACTION_RECORD: ["journal_entry", "suspicious_transaction", "transaction"],
  APPROVAL_TRAIL: ["approval", "workflow", "journal_entry"],
  SYSTEM_CONFIG: ["configuration", "system_setting"],
  USER_ACCESS_LISTING: ["user_access", "role_assignment"],
};

/**
 * Auto-collect evidence for a single finding.
 * Queries related ERP data points, generates an LLM summary of relevance,
 * and creates Evidence records linked to the finding.
 */
export async function autoCollectEvidence(
  organizationId: string,
  findingId: string
): Promise<AutoEvidenceResult> {
  const result: AutoEvidenceResult = {
    findingId,
    evidenceCollected: 0,
    types: [],
    summary: "",
  };

  // Load finding with its rule and linked data points
  const finding = await db.finding.findUnique({
    where: { id: findingId },
    include: {
      rule: { select: { id: true, name: true, domain: true, framework: true } },
      dataPoints: {
        include: {
          dataPoint: {
            select: {
              id: true,
              connectorId: true,
              domain: true,
              dataType: true,
              data: true,
              pulledAt: true,
            },
          },
        },
        take: 10,
      },
    },
  });

  if (!finding) {
    result.summary = "Finding not found.";
    return result;
  }

  // Determine the domain from the rule or the finding's data points
  const domain =
    finding.rule?.domain ||
    finding.dataPoints[0]?.dataPoint?.domain ||
    "SOX_CONTROLS";

  const evidenceTypes = DOMAIN_EVIDENCE_MAP[domain] || [
    "CHANGE_LOG",
    "TRANSACTION_RECORD",
  ];

  // Build the time window: finding creation -24h to +24h
  const windowStart = new Date(finding.createdAt.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(finding.createdAt.getTime() + 24 * 60 * 60 * 1000);

  // Get connector IDs from the finding's data points, or all org connectors
  const connectorIds = [
    ...new Set(finding.dataPoints.map((dp) => dp.dataPoint.connectorId)),
  ];

  const connectorFilter =
    connectorIds.length > 0
      ? { id: { in: connectorIds } }
      : { organizationId };

  const createdTypes: string[] = [];

  for (const evidenceType of evidenceTypes) {
    const relevantDataTypes = EVIDENCE_TYPE_DATA_MAP[evidenceType] || [];
    if (relevantDataTypes.length === 0) continue;

    // Query related ERP data points for this evidence type
    const relatedDataPoints = await db.eRPDataPoint.findMany({
      where: {
        connector: connectorFilter,
        dataType: { in: relevantDataTypes },
        pulledAt: { gte: windowStart, lte: windowEnd },
      },
      take: 20,
      orderBy: { pulledAt: "desc" },
    });

    if (relatedDataPoints.length === 0) continue;

    // Build a data summary for the LLM
    const dataSnippets = relatedDataPoints
      .slice(0, 10)
      .map((dp) => {
        const data = dp.data as Record<string, unknown>;
        // Truncate large objects
        const snippet = JSON.stringify(data).slice(0, 500);
        return `[${dp.dataType} @ ${dp.pulledAt.toISOString()}] ${snippet}`;
      })
      .join("\n");

    // Use LLM to generate an evidence summary
    let evidenceSummary: string;
    try {
      const llmResponse = await routeLLMRequest(organizationId, {
        systemPrompt: `You are a compliance evidence analyst. Given a compliance finding and related ERP data records, write a concise 2-3 sentence evidence summary explaining:
1. What the data shows
2. How it relates to the finding
3. Whether it supports or contradicts the violation
Be factual and specific. Reference record counts and key values.`,
        userPrompt: `Finding: ${finding.title}
Description: ${finding.description}
Severity: ${finding.severity}
Framework: ${finding.framework || finding.rule?.framework || "N/A"}
Domain: ${domain}

Evidence type: ${evidenceType}
Related records (${relatedDataPoints.length} total):
${dataSnippets}`,
        maxTokens: 300,
        temperature: 0.1,
      });
      evidenceSummary = llmResponse.content;
    } catch {
      evidenceSummary = `Auto-collected ${relatedDataPoints.length} ${evidenceType.toLowerCase().replace(/_/g, " ")} records from the ${domain} domain within the finding's time window.`;
    }

    // Create the Evidence record
    await db.evidence.create({
      data: {
        organizationId,
        findingId,
        type: "AUTO_COLLECTED",
        title: `${formatEvidenceType(evidenceType)} — ${relatedDataPoints.length} records`,
        description: evidenceSummary,
        data: JSON.parse(JSON.stringify({
          evidenceType,
          domain,
          recordCount: relatedDataPoints.length,
          timeWindow: {
            from: windowStart.toISOString(),
            to: windowEnd.toISOString(),
          },
          dataPointIds: relatedDataPoints.map((dp) => dp.id),
          sampleData: relatedDataPoints.slice(0, 5).map((dp) => ({
            id: dp.id,
            dataType: dp.dataType,
            pulledAt: dp.pulledAt.toISOString(),
            data: truncateData(dp.data as Record<string, unknown>, 200),
          })),
        })),
        isAutoCollected: true,
        collectedBy: "system",
      },
    });

    createdTypes.push(evidenceType);
    result.evidenceCollected++;
  }

  result.types = createdTypes;
  result.summary =
    createdTypes.length > 0
      ? `Collected ${createdTypes.length} evidence type(s): ${createdTypes.join(", ")}`
      : "No related evidence data found in the time window.";

  return result;
}

/**
 * Batch-collect evidence for all open findings that don't have auto-collected evidence yet.
 */
export async function autoCollectEvidenceBatch(
  organizationId: string,
  limit?: number
): Promise<{
  processed: number;
  evidenceCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let evidenceCreated = 0;

  // Find open findings without any auto-collected evidence
  const findings = await db.finding.findMany({
    where: {
      organizationId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      evidence: {
        none: { isAutoCollected: true },
      },
    },
    select: { id: true },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: limit || 20,
  });

  for (const finding of findings) {
    try {
      const result = await autoCollectEvidence(organizationId, finding.id);
      evidenceCreated += result.evidenceCollected;
      processed++;
    } catch (err) {
      errors.push(
        `Finding ${finding.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { processed, evidenceCreated, errors };
}

/**
 * Format an evidence type constant into a human-readable label.
 */
function formatEvidenceType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Truncate a data object's string representation to a max character length.
 */
function truncateData(
  data: Record<string, unknown>,
  maxLen: number
): Record<string, unknown> {
  const json = JSON.stringify(data);
  if (json.length <= maxLen) return data;

  // Return a subset of keys that fit within the limit
  const truncated: Record<string, unknown> = {};
  let currentLen = 2; // {}
  for (const [key, value] of Object.entries(data)) {
    const entryJson = JSON.stringify({ [key]: value });
    if (currentLen + entryJson.length > maxLen) break;
    truncated[key] = value;
    currentLen += entryJson.length;
  }
  truncated._truncated = true;
  return truncated;
}
