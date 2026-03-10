// ============================================
// CCM — DeepSeek R1 Compliance Reasoning Engine
// Deep chain-of-thought reasoning for compliance findings
// ============================================

import OpenAI from "openai";
import {
  complianceReasoningSchema,
  clusterAnalysisSchema,
  sodViolationSchema,
  parseLLMJson,
} from "./structured-schemas";

// ---- Lazy-init DeepSeek R1 client (same pattern as Sentinel) ----

let _reasoningClient: OpenAI | null = null;

function getReasoningClient(): OpenAI {
  if (!_reasoningClient) {
    _reasoningClient = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });
  }
  return _reasoningClient;
}

// ---- Structured Output Types ----

export interface ComplianceReasoningResult {
  rootCause: {
    category:
      | "PROCESS_FAILURE"
      | "CONTROL_GAP"
      | "HUMAN_ERROR"
      | "SYSTEM_MISCONFIGURATION"
      | "POLICY_VIOLATION"
      | "FRAUD_INDICATOR"
      | "DATA_INTEGRITY"
      | "ACCESS_VIOLATION";
    description: string;
    contributingFactors: string[];
    confidence: number;
  };
  riskAssessment: {
    inherentRiskScore: number;
    residualRiskScore: number;
    financialExposure: {
      estimatedLoss: string;
      currency: string;
      basis: string;
    };
    regulatoryExposure: {
      applicableRegulations: string[];
      potentialPenalties: string;
      reportingDeadlines: string[];
    };
    operationalImpact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  };
  reasoningChain: {
    step: number;
    thought: string;
    conclusion: string;
  }[];
  controlMapping: {
    primaryControl: string;
    relatedControls: string[];
    frameworkReferences: {
      framework: string;
      section: string;
      requirement: string;
    }[];
  };
  recommendations: {
    immediate: { action: string; owner: string; deadline: string }[];
    shortTerm: { action: string; owner: string; deadline: string }[];
    longTerm: { action: string; owner: string; deadline: string }[];
  };
  aiSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severityJustification: string;
  patterns: {
    isRecurring: boolean;
    relatedFindingPatterns: string[];
    trendDirection: "ESCALATING" | "STABLE" | "IMPROVING";
  };
  reasoningTokens: number;
}

// ---- System Prompt ----

const COMPLIANCE_REASONING_PROMPT = `You are an expert compliance reasoning engine with deep expertise in SOX (Sarbanes-Oxley), PCI-DSS, AML/BSA (Anti-Money Laundering / Bank Secrecy Act), HIPAA, GDPR, ISO 27001, NIST CSF, SOC 2, and COSO Internal Control frameworks.

Your task is to perform deep chain-of-thought analysis on compliance findings from ERP systems (SAP, Oracle, Dynamics 365, Workday, NetSuite). You must:

1. ROOT CAUSE ANALYSIS: Identify the underlying cause using these categories:
   - PROCESS_FAILURE: Broken or missing business process
   - CONTROL_GAP: Missing or inadequate control
   - HUMAN_ERROR: Mistake by personnel
   - SYSTEM_MISCONFIGURATION: Incorrect system setup
   - POLICY_VIOLATION: Deliberate or negligent breach of policy
   - FRAUD_INDICATOR: Pattern suggesting intentional manipulation
   - DATA_INTEGRITY: Corrupt, incomplete, or inconsistent data
   - ACCESS_VIOLATION: Unauthorized access or excessive privileges

2. RISK SCORING:
   - Inherent risk (0-100): Risk without any controls. Score 80+ for fraud indicators, 60-79 for control gaps with financial impact, 40-59 for process failures, 20-39 for data issues.
   - Residual risk (0-100): Risk after existing controls. Generally 30-60% of inherent risk if compensating controls exist.
   - Financial exposure: Estimate realistic dollar ranges based on industry benchmarks and transaction volumes.
   - Regulatory exposure: Map to specific regulations and cite penalty ranges (e.g., SOX: personal liability up to $5M; GDPR: up to 4% of global turnover).

3. SEVERITY SCORING:
   - CRITICAL: Active fraud, imminent regulatory action, systemic control failure. Score 85-100.
   - HIGH: Significant control gap, material financial risk, compliance deadline at risk. Score 65-84.
   - MEDIUM: Process weakness, potential for escalation, remediation needed within quarter. Score 40-64.
   - LOW: Minor deviation, informational, best-practice improvement. Score 0-39.

4. CONTROL MAPPING: Map findings to specific control frameworks:
   - SOX: ITGC categories (Access, Change Management, Operations, SDLC)
   - ISO 27001: Annex A controls (A.5-A.18)
   - NIST CSF: Functions (Identify, Protect, Detect, Respond, Recover)
   - PCI-DSS: Requirements (1-12)
   - COSO: Components (Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring)

5. PATTERN DETECTION: Analyze historical findings to identify:
   - Recurring issues (same root cause appearing multiple times)
   - Escalating trends (increasing severity or frequency)
   - Systemic problems (multiple controls failing from a single root cause)

6. RECOMMENDATIONS: Provide prioritized actions:
   - Immediate (0-48 hours): Stop-the-bleeding actions
   - Short-term (1-4 weeks): Root cause fixes
   - Long-term (1-6 months): Systemic improvements and prevention

You MUST respond with valid JSON matching this exact schema:
{
  "rootCause": {
    "category": "<one of the 8 categories>",
    "description": "<detailed root cause explanation>",
    "contributingFactors": ["<factor1>", "<factor2>"],
    "confidence": <0-100>
  },
  "riskAssessment": {
    "inherentRiskScore": <0-100>,
    "residualRiskScore": <0-100>,
    "financialExposure": {
      "estimatedLoss": "<dollar range>",
      "currency": "USD",
      "basis": "<how estimate was derived>"
    },
    "regulatoryExposure": {
      "applicableRegulations": ["<reg1>", "<reg2>"],
      "potentialPenalties": "<penalty description>",
      "reportingDeadlines": ["<deadline1>"]
    },
    "operationalImpact": "<CRITICAL|HIGH|MEDIUM|LOW>"
  },
  "reasoningChain": [
    {"step": 1, "thought": "<analysis step>", "conclusion": "<finding>"}
  ],
  "controlMapping": {
    "primaryControl": "<control ID or name>",
    "relatedControls": ["<control1>"],
    "frameworkReferences": [
      {"framework": "<name>", "section": "<section>", "requirement": "<requirement>"}
    ]
  },
  "recommendations": {
    "immediate": [{"action": "<action>", "owner": "<role>", "deadline": "<timeframe>"}],
    "shortTerm": [{"action": "<action>", "owner": "<role>", "deadline": "<timeframe>"}],
    "longTerm": [{"action": "<action>", "owner": "<role>", "deadline": "<timeframe>"}]
  },
  "aiSeverity": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "severityJustification": "<why this severity was assigned>",
  "patterns": {
    "isRecurring": <true|false>,
    "relatedFindingPatterns": ["<pattern description>"],
    "trendDirection": "<ESCALATING|STABLE|IMPROVING>"
  }
}

Be precise, cite specific regulations, and avoid generic advice. Every recommendation must have a clear owner and deadline.`;

const CLUSTER_REASONING_PROMPT = `You are an expert compliance analyst performing cross-finding analysis on a cluster of related compliance findings. Identify systemic patterns, common root causes, and whether these findings together represent a greater risk than each individually.

You MUST respond with valid JSON:
{
  "clusterAnalysis": "<detailed narrative of how these findings relate>",
  "commonRootCause": "<the shared underlying cause>",
  "systemicRisk": <true if the cluster reveals a systemic issue>,
  "overallRiskScore": <0-100, may be higher than individual scores if systemic>,
  "recommendations": ["<recommendation1>", "<recommendation2>"]
}`;

const SOD_REASONING_PROMPT = `You are an expert Segregation of Duties (SoD) analyst. Analyze the provided SoD violation to determine:
1. The actual risk level considering the specific role combination
2. Whether the conflict has been exploited (based on transaction patterns)
3. The recommended course of action
4. Compensating controls that could mitigate the risk if a waiver is needed

Key SoD conflict categories:
- Create/Approve: User can both create and approve the same transaction (purchase orders, payments, journals)
- Record/Reconcile: User handles both recording and reconciling (bank recs, inventory counts)
- Custody/Recording: User has physical custody AND records transactions (cash handling + GL entries)
- Admin/Business: User has system admin rights AND performs business transactions

You MUST respond with valid JSON:
{
  "riskLevel": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "isExploited": <true|false>,
  "exploitationEvidence": ["<evidence1>", "<evidence2>"],
  "recommendedAction": "<IMMEDIATE_REVOKE|WAIVER_WITH_MONITORING|ACCEPT_WITH_COMPENSATING|ESCALATE_TO_MANAGEMENT>",
  "compensatingControls": ["<control1>", "<control2>"],
  "waiverConditions": ["<condition1>"],
  "reasoningChain": [
    {"step": 1, "thought": "<analysis>", "conclusion": "<finding>"}
  ]
}`;

// ---- Core Reasoning Functions ----

/**
 * Deep chain-of-thought reasoning about a single compliance finding.
 * Uses DeepSeek R1 (deepseek-reasoner) for maximum reasoning depth.
 */
export async function reasonAboutFinding(finding: {
  id: string;
  title: string;
  description: string;
  severity: string;
  framework?: string;
  controlId?: string;
  ruleName?: string;
  ruleDefinition?: unknown;
  dataPoints: { domain: string; dataType: string; data: unknown }[];
  existingAnalysis?: string;
  historicalFindings?: {
    title: string;
    severity: string;
    status: string;
    createdAt: Date;
  }[];
}): Promise<ComplianceReasoningResult> {
  const client = getReasoningClient();

  // Build detailed user prompt with all available context
  let userPrompt = `**FINDING**: ${finding.title}\n\n`;
  userPrompt += `**DESCRIPTION**: ${finding.description}\n\n`;
  userPrompt += `**CURRENT SEVERITY**: ${finding.severity}\n`;
  userPrompt += `**FRAMEWORK**: ${finding.framework || "Not specified"}\n`;
  userPrompt += `**CONTROL ID**: ${finding.controlId || "Not specified"}\n`;
  userPrompt += `**RULE**: ${finding.ruleName || "Not specified"}\n\n`;

  if (finding.ruleDefinition) {
    userPrompt += `**RULE DEFINITION**:\n${JSON.stringify(finding.ruleDefinition, null, 2)}\n\n`;
  }

  if (finding.dataPoints.length > 0) {
    userPrompt += `**SUPPORTING DATA**:\n`;
    for (const dp of finding.dataPoints) {
      userPrompt += `- [${dp.domain}/${dp.dataType}]: ${JSON.stringify(dp.data)}\n`;
    }
    userPrompt += "\n";
  }

  if (finding.existingAnalysis) {
    userPrompt += `**EXISTING ANALYSIS**:\n${finding.existingAnalysis}\n\n`;
  }

  if (finding.historicalFindings && finding.historicalFindings.length > 0) {
    userPrompt += `**HISTORICAL FINDINGS (same rule)**:\n`;
    for (const hf of finding.historicalFindings) {
      userPrompt += `- "${hf.title}" | Severity: ${hf.severity} | Status: ${hf.status} | Date: ${hf.createdAt.toISOString().split("T")[0]}\n`;
    }
    userPrompt += "\n";
  }

  userPrompt +=
    "Perform deep reasoning analysis and provide your assessment as JSON.";

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
    messages: [
      { role: "system", content: COMPLIANCE_REASONING_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 8192,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from reasoning model");
  }

  const reasoningTokens =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0);

  const parsed = parseLLMJson(content, complianceReasoningSchema);
  if (!parsed.success) {
    throw new Error(
      `Failed to parse reasoning response: ${parsed.error}`
    );
  }

  return {
    ...parsed.data,
    reasoningTokens,
  };
}

/**
 * Batch reasoning for multiple related findings (cross-finding analysis).
 * Identifies systemic patterns across a cluster of findings.
 */
export async function reasonAboutFindingCluster(
  findings: {
    id: string;
    title: string;
    severity: string;
    framework?: string;
    controlId?: string;
    aiAnalysis?: string;
  }[]
): Promise<{
  clusterAnalysis: string;
  commonRootCause: string;
  systemicRisk: boolean;
  overallRiskScore: number;
  recommendations: string[];
  reasoningTokens: number;
}> {
  if (findings.length === 0) {
    return {
      clusterAnalysis: "No findings to analyze.",
      commonRootCause: "N/A",
      systemicRisk: false,
      overallRiskScore: 0,
      recommendations: [],
      reasoningTokens: 0,
    };
  }

  const client = getReasoningClient();

  let userPrompt = `**FINDING CLUSTER** (${findings.length} related findings):\n\n`;
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    userPrompt += `### Finding ${i + 1}: ${f.title}\n`;
    userPrompt += `- Severity: ${f.severity}\n`;
    userPrompt += `- Framework: ${f.framework || "N/A"}\n`;
    userPrompt += `- Control: ${f.controlId || "N/A"}\n`;
    if (f.aiAnalysis) {
      // Truncate long analyses to stay within context limits
      const truncated =
        f.aiAnalysis.length > 500
          ? f.aiAnalysis.substring(0, 500) + "..."
          : f.aiAnalysis;
      userPrompt += `- AI Analysis: ${truncated}\n`;
    }
    userPrompt += "\n";
  }

  userPrompt +=
    "Analyze the relationships between these findings and identify systemic patterns. Respond with JSON.";

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
    messages: [
      { role: "system", content: CLUSTER_REASONING_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from cluster reasoning model");
  }

  const reasoningTokens =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0);

  const parsed = parseLLMJson(content, clusterAnalysisSchema);
  if (!parsed.success) {
    throw new Error(
      `Failed to parse cluster reasoning response: ${parsed.error}`
    );
  }

  return {
    ...parsed.data,
    reasoningTokens,
  };
}

/**
 * SoD-specific deep reasoning.
 * Analyzes Segregation of Duties violations with transaction pattern analysis.
 */
export async function reasonAboutSoDViolation(violation: {
  userId: string;
  userName?: string;
  conflictingRoles: string[];
  activeRoles: {
    role: string;
    validFrom?: string;
    validTo?: string;
    assignedBy?: string;
  }[];
  recentTransactions?: {
    type: string;
    amount?: number;
    date: string;
    description: string;
  }[];
  organizationType?: string;
}): Promise<{
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  isExploited: boolean;
  exploitationEvidence: string[];
  recommendedAction:
    | "IMMEDIATE_REVOKE"
    | "WAIVER_WITH_MONITORING"
    | "ACCEPT_WITH_COMPENSATING"
    | "ESCALATE_TO_MANAGEMENT";
  compensatingControls: string[];
  waiverConditions?: string[];
  reasoningChain: { step: number; thought: string; conclusion: string }[];
  reasoningTokens: number;
}> {
  const client = getReasoningClient();

  let userPrompt = `**SOD VIOLATION ANALYSIS**\n\n`;
  userPrompt += `**User**: ${violation.userName || violation.userId}\n`;
  userPrompt += `**User ID**: ${violation.userId}\n`;
  userPrompt += `**Organization Type**: ${violation.organizationType || "Not specified"}\n\n`;

  userPrompt += `**Conflicting Roles**: ${violation.conflictingRoles.join(", ")}\n\n`;

  userPrompt += `**All Active Roles**:\n`;
  for (const role of violation.activeRoles) {
    userPrompt += `- ${role.role}`;
    if (role.validFrom) userPrompt += ` (from: ${role.validFrom}`;
    if (role.validTo) userPrompt += `, to: ${role.validTo}`;
    if (role.validFrom) userPrompt += `)`;
    if (role.assignedBy) userPrompt += ` — assigned by: ${role.assignedBy}`;
    userPrompt += "\n";
  }
  userPrompt += "\n";

  if (violation.recentTransactions && violation.recentTransactions.length > 0) {
    userPrompt += `**Recent Transactions by this User** (last 90 days):\n`;
    for (const tx of violation.recentTransactions.slice(0, 50)) {
      userPrompt += `- ${tx.date} | ${tx.type}`;
      if (tx.amount !== undefined) userPrompt += ` | $${tx.amount.toLocaleString()}`;
      userPrompt += ` | ${tx.description}\n`;
    }
    userPrompt += "\n";
  }

  userPrompt +=
    "Analyze this SoD violation for exploitation risk and recommend action. Respond with JSON.";

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
    messages: [
      { role: "system", content: SOD_REASONING_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from SoD reasoning model");
  }

  const reasoningTokens =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0);

  const parsed = parseLLMJson(content, sodViolationSchema);
  if (!parsed.success) {
    throw new Error(
      `Failed to parse SoD reasoning response: ${parsed.error}`
    );
  }

  return {
    ...parsed.data,
    waiverConditions: parsed.data.waiverConditions ?? [],
    reasoningTokens,
  };
}
