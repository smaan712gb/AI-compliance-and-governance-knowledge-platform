import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parseLLMJson,
  complianceReasoningSchema,
  remediationPlanSchema,
  reportNarrativeSchema,
} from "../structured-schemas";

// ---- parseLLMJson ----

describe("parseLLMJson", () => {
  const simpleSchema = z.object({ name: z.string(), value: z.number() });

  it("extracts JSON from plain text", () => {
    const raw = 'Here is the result: {"name": "test", "value": 42} end';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("test");
      expect(result.data.value).toBe(42);
    }
  });

  it("extracts JSON from markdown code blocks with json tag", () => {
    const raw = 'Some preamble\n```json\n{"name": "block", "value": 99}\n```\nSome epilogue';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("block");
      expect(result.data.value).toBe(99);
    }
  });

  it("extracts JSON from code blocks without language tag", () => {
    const raw = '```\n{"name": "notag", "value": 7}\n```';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("notag");
      expect(result.data.value).toBe(7);
    }
  });

  it("returns error for non-JSON input", () => {
    const raw = "This is just plain text without any JSON at all.";
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No JSON object found");
      expect(result.raw).toBe(raw);
    }
  });

  it("returns error for invalid JSON", () => {
    const raw = '{"name": "broken, "value": }';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/JSON parse error|Schema validation failed/);
    }
  });

  it("validates against schema and returns typed data", () => {
    const raw = '{"name": "typed", "value": 123}';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.name).toBe("string");
      expect(typeof result.data.value).toBe("number");
      expect(result.data).toEqual({ name: "typed", value: 123 });
    }
  });

  it("returns validation error for schema mismatch", () => {
    const raw = '{"name": 123, "value": "not a number"}';
    const result = parseLLMJson(raw, simpleSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Schema validation failed");
      expect(result.raw).toBe(raw);
    }
  });
});

// ---- complianceReasoningSchema ----

describe("complianceReasoningSchema", () => {
  const validReasoning = {
    rootCause: {
      category: "CONTROL_GAP",
      description: "Missing dual-approval for wire transfers",
      contributingFactors: ["Understaffing", "No automated checks"],
      confidence: 85,
    },
    riskAssessment: {
      inherentRiskScore: 78,
      residualRiskScore: 45,
      financialExposure: {
        estimatedLoss: "500000",
        currency: "USD",
        basis: "Historical transaction volume",
      },
      regulatoryExposure: {
        applicableRegulations: ["BSA/AML", "OFAC"],
        potentialPenalties: "$1M fine",
        reportingDeadlines: ["30 days"],
      },
      operationalImpact: "HIGH",
    },
    reasoningChain: [
      { step: 1, thought: "Check controls", conclusion: "Gap found" },
    ],
    controlMapping: {
      primaryControl: "CTRL-001",
      relatedControls: ["CTRL-002"],
      frameworkReferences: [
        { framework: "SOX", section: "404", requirement: "Internal controls" },
      ],
    },
    recommendations: {
      immediate: [{ action: "Add approval step", owner: "CFO", deadline: "1 week" }],
      shortTerm: [{ action: "Automate workflow", owner: "IT", deadline: "1 month" }],
      longTerm: [{ action: "Implement AI monitoring", owner: "CTO", deadline: "6 months" }],
    },
    aiSeverity: "HIGH",
    severityJustification: "Financial exposure exceeds threshold",
    patterns: {
      isRecurring: true,
      relatedFindingPatterns: ["WIRE-*"],
      trendDirection: "ESCALATING",
    },
  };

  it("validates correct input", () => {
    const result = complianceReasoningSchema.safeParse(validReasoning);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rootCause.category).toBe("CONTROL_GAP");
      expect(result.data.riskAssessment.inherentRiskScore).toBe(78);
      expect(result.data.aiSeverity).toBe("HIGH");
    }
  });

  it("rejects missing required fields", () => {
    const incomplete = { rootCause: { category: "CONTROL_GAP" } };
    const result = complianceReasoningSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("enforces enum values for rootCause.category", () => {
    const bad = { ...validReasoning, rootCause: { ...validReasoning.rootCause, category: "INVALID_CATEGORY" } };
    const result = complianceReasoningSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const categoryIssue = result.error.issues.find((i) => i.path.includes("category"));
      expect(categoryIssue).toBeDefined();
    }
  });

  it("enforces riskScore range (0-100)", () => {
    const over = {
      ...validReasoning,
      riskAssessment: { ...validReasoning.riskAssessment, inherentRiskScore: 150 },
    };
    const result = complianceReasoningSchema.safeParse(over);
    expect(result.success).toBe(false);

    const under = {
      ...validReasoning,
      riskAssessment: { ...validReasoning.riskAssessment, inherentRiskScore: -5 },
    };
    const result2 = complianceReasoningSchema.safeParse(under);
    expect(result2.success).toBe(false);
  });
});

// ---- remediationPlanSchema ----

describe("remediationPlanSchema", () => {
  const validPlan = {
    summary: "Remediation plan for wire transfer control gap",
    steps: [
      {
        order: 1,
        title: "Add dual approval",
        description: "Implement dual-approval workflow for wire transfers > $10K",
        responsible: "Operations Manager",
        estimatedDays: 5,
        verificationCriteria: "All wires > $10K require two approvals",
        automatable: true,
      },
    ],
    preventionMeasures: ["Automated screening", "Monthly audits"],
    references: ["BSA/AML Guidelines Section 5.2"],
    estimatedTotalDays: 30,
    requiredResources: ["1 developer", "Compliance officer"],
  };

  it("validates correct plan structure", () => {
    const result = remediationPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toContain("wire transfer");
      expect(result.data.steps).toHaveLength(1);
      expect(result.data.steps[0].order).toBe(1);
      expect(result.data.steps[0].automatable).toBe(true);
      expect(result.data.estimatedTotalDays).toBe(30);
    }
  });

  it("rejects missing step fields", () => {
    const badPlan = {
      ...validPlan,
      steps: [{ order: 1, title: "Incomplete step" }],
    };
    const result = remediationPlanSchema.safeParse(badPlan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

// ---- reportNarrativeSchema ----

describe("reportNarrativeSchema", () => {
  const validNarrative = {
    executiveSummary: "Overall compliance posture needs improvement",
    compliancePosture: "NEEDS_IMPROVEMENT",
    riskScore: 65,
    keyFindings: [
      {
        title: "Wire transfer gaps",
        severity: "HIGH",
        impact: "Financial exposure of $500K",
        recommendation: "Implement dual-approval",
      },
    ],
    trendAnalysis: {
      direction: "DETERIORATING",
      factors: ["Increased transaction volume", "Staff turnover"],
    },
    regulatoryRisks: [
      { regulation: "BSA/AML", riskLevel: "HIGH", action: "File SAR" },
    ],
    recommendations: [
      {
        priority: "IMMEDIATE",
        action: "Close control gap",
        owner: "CFO",
        deadline: "2 weeks",
      },
    ],
  };

  it("validates correct narrative structure", () => {
    const result = reportNarrativeSchema.safeParse(validNarrative);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.compliancePosture).toBe("NEEDS_IMPROVEMENT");
      expect(result.data.riskScore).toBe(65);
      expect(result.data.keyFindings).toHaveLength(1);
      expect(result.data.trendAnalysis.direction).toBe("DETERIORATING");
      expect(result.data.recommendations[0].priority).toBe("IMMEDIATE");
    }
  });

  it("enforces compliancePosture enum", () => {
    const bad = { ...validNarrative, compliancePosture: "TERRIBLE" };
    const result = reportNarrativeSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const postureIssue = result.error.issues.find((i) =>
        i.path.includes("compliancePosture")
      );
      expect(postureIssue).toBeDefined();
    }
  });

  it("rejects riskScore outside 0-100 range", () => {
    const overResult = reportNarrativeSchema.safeParse({ ...validNarrative, riskScore: 101 });
    expect(overResult.success).toBe(false);
    const underResult = reportNarrativeSchema.safeParse({ ...validNarrative, riskScore: -1 });
    expect(underResult.success).toBe(false);
  });

  it("accepts all valid compliancePosture values", () => {
    for (const posture of ["STRONG", "ADEQUATE", "NEEDS_IMPROVEMENT", "CRITICAL"]) {
      const result = reportNarrativeSchema.safeParse({ ...validNarrative, compliancePosture: posture });
      expect(result.success).toBe(true);
    }
  });
});
