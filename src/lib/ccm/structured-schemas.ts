// ============================================
// CCM — Structured Output Schemas
// Zod schemas for validating all LLM outputs
// ============================================

import { z } from "zod";

// ---- Compliance Reasoning Schema ----

export const complianceReasoningSchema = z.object({
  rootCause: z.object({
    category: z.enum([
      "PROCESS_FAILURE",
      "CONTROL_GAP",
      "HUMAN_ERROR",
      "SYSTEM_MISCONFIGURATION",
      "POLICY_VIOLATION",
      "FRAUD_INDICATOR",
      "DATA_INTEGRITY",
      "ACCESS_VIOLATION",
    ]),
    description: z.string(),
    contributingFactors: z.array(z.string()),
    confidence: z.number().min(0).max(100),
  }),
  riskAssessment: z.object({
    inherentRiskScore: z.number().min(0).max(100),
    residualRiskScore: z.number().min(0).max(100),
    financialExposure: z.object({
      estimatedLoss: z.string(),
      currency: z.string(),
      basis: z.string(),
    }),
    regulatoryExposure: z.object({
      applicableRegulations: z.array(z.string()),
      potentialPenalties: z.string(),
      reportingDeadlines: z.array(z.string()),
    }),
    operationalImpact: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  }),
  reasoningChain: z.array(
    z.object({
      step: z.number(),
      thought: z.string(),
      conclusion: z.string(),
    })
  ),
  controlMapping: z.object({
    primaryControl: z.string(),
    relatedControls: z.array(z.string()),
    frameworkReferences: z.array(
      z.object({
        framework: z.string(),
        section: z.string(),
        requirement: z.string(),
      })
    ),
  }),
  recommendations: z.object({
    immediate: z.array(
      z.object({
        action: z.string(),
        owner: z.string(),
        deadline: z.string(),
      })
    ),
    shortTerm: z.array(
      z.object({
        action: z.string(),
        owner: z.string(),
        deadline: z.string(),
      })
    ),
    longTerm: z.array(
      z.object({
        action: z.string(),
        owner: z.string(),
        deadline: z.string(),
      })
    ),
  }),
  aiSeverity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  severityJustification: z.string(),
  patterns: z.object({
    isRecurring: z.boolean(),
    relatedFindingPatterns: z.array(z.string()),
    trendDirection: z.enum(["ESCALATING", "STABLE", "IMPROVING"]),
  }),
});

export type ComplianceReasoningParsed = z.infer<typeof complianceReasoningSchema>;

// ---- Remediation Plan Schema ----

export const remediationPlanSchema = z.object({
  summary: z.string(),
  steps: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      description: z.string(),
      responsible: z.string(),
      estimatedDays: z.number(),
      verificationCriteria: z.string(),
      automatable: z.boolean(),
    })
  ),
  preventionMeasures: z.array(z.string()),
  references: z.array(z.string()),
  estimatedTotalDays: z.number(),
  requiredResources: z.array(z.string()),
});

export type RemediationPlanParsed = z.infer<typeof remediationPlanSchema>;

// ---- Report Narrative Schema ----

export const reportNarrativeSchema = z.object({
  executiveSummary: z.string(),
  compliancePosture: z.enum([
    "STRONG",
    "ADEQUATE",
    "NEEDS_IMPROVEMENT",
    "CRITICAL",
  ]),
  riskScore: z.number().min(0).max(100),
  keyFindings: z.array(
    z.object({
      title: z.string(),
      severity: z.string(),
      impact: z.string(),
      recommendation: z.string(),
    })
  ),
  trendAnalysis: z.object({
    direction: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]),
    factors: z.array(z.string()),
  }),
  regulatoryRisks: z.array(
    z.object({
      regulation: z.string(),
      riskLevel: z.string(),
      action: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(["IMMEDIATE", "SHORT_TERM", "LONG_TERM"]),
      action: z.string(),
      owner: z.string(),
      deadline: z.string(),
    })
  ),
});

export type ReportNarrativeParsed = z.infer<typeof reportNarrativeSchema>;

// ---- Cluster Analysis Schema ----

export const clusterAnalysisSchema = z.object({
  clusterAnalysis: z.string(),
  commonRootCause: z.string(),
  systemicRisk: z.boolean(),
  overallRiskScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
});

export type ClusterAnalysisParsed = z.infer<typeof clusterAnalysisSchema>;

// ---- SoD Violation Analysis Schema ----

export const sodViolationSchema = z.object({
  riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  isExploited: z.boolean(),
  exploitationEvidence: z.array(z.string()),
  recommendedAction: z.enum([
    "IMMEDIATE_REVOKE",
    "WAIVER_WITH_MONITORING",
    "ACCEPT_WITH_COMPENSATING",
    "ESCALATE_TO_MANAGEMENT",
  ]),
  compensatingControls: z.array(z.string()),
  waiverConditions: z.array(z.string()).optional(),
  reasoningChain: z.array(
    z.object({
      step: z.number(),
      thought: z.string(),
      conclusion: z.string(),
    })
  ),
});

export type SoDViolationParsed = z.infer<typeof sodViolationSchema>;

// ---- Helper: Parse LLM JSON Output ----

/**
 * Safely parses LLM-generated JSON (which may be wrapped in markdown code blocks)
 * and validates it against a Zod schema.
 */
export function parseLLMJson<T>(
  raw: string,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string; raw: string } {
  try {
    // Step 1: Extract JSON from markdown code blocks if present
    let jsonStr = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Step 2: Try to find a JSON object in the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      return {
        success: false,
        error: "No JSON object found in LLM response",
        raw,
      };
    }

    // Step 3: Parse the JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(objMatch[0]);
    } catch (parseErr) {
      return {
        success: false,
        error: `JSON parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        raw,
      };
    }

    // Step 4: Validate with Zod schema
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        success: false,
        error: `Schema validation failed: ${issues}`,
        raw,
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      raw,
    };
  }
}
