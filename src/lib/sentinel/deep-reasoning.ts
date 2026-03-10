import OpenAI from "openai";

// ============================================
// SENTINEL — Deep Multi-Hop Reasoning Engine
// Extends basic reasoning with:
// - Multi-hop inference chains
// - Conflict escalation modeling
// - Cross-source narrative analysis
// - Actor intention modeling
// ============================================

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });
  }
  return _client;
}

export interface EscalationPrediction {
  currentPhase: string;
  escalationProbability: number;
  deescalationProbability: number;
  predictedTrajectory: {
    timeframe: string;
    scenario: string;
    probability: number;
    triggers: string[];
  }[];
  actorAnalysis: {
    actor: string;
    intentions: string[];
    capabilities: string[];
    constraints: string[];
    likelyActions: string[];
  }[];
  earlyWarningIndicators: string[];
  reasoningChain: { step: number; thought: string; conclusion: string }[];
  reasoningTokens: number;
}

export interface NarrativeAnalysis {
  sourceComparison: {
    source: string;
    framing: string;
    bias: string;
    missingContext: string;
  }[];
  consensusPoints: string[];
  divergencePoints: string[];
  informationGaps: string[];
  recommendedNarrative: string;
  confidenceScore: number;
  reasoningTokens: number;
}

export interface CascadeAnalysis {
  primaryEvent: string;
  cascadeChain: {
    order: number;
    effect: string;
    sector: string;
    country: string;
    probability: number;
    timeframe: string;
    magnitude: "SEVERE" | "MODERATE" | "MINOR";
  }[];
  totalEconomicImpact: string;
  affectedPopulation: string;
  mitigationOptions: string[];
  reasoningTokens: number;
}

// ---- Prompts ----

const ESCALATION_SYSTEM_PROMPT = `You are a senior geopolitical strategist and conflict analyst with deep expertise in game theory, deterrence models, and multi-actor dynamics. You analyze events through the lens of rational actor theory while accounting for miscalculation, domestic political pressures, and information asymmetry.

Analyze the provided event and produce a structured conflict escalation assessment. Consider:
1. Historical precedent for similar situations
2. Actor incentive structures and red lines
3. Alliance dynamics and third-party interests
4. Economic interdependencies as constraints
5. Domestic political pressures on key actors
6. Information environment and miscalculation risks

You MUST respond with valid JSON matching this exact schema:
{
  "currentPhase": "<crisis phase: e.g. 'Pre-crisis tension', 'Active escalation', 'Peak crisis', 'De-escalation', 'Frozen conflict'>",
  "escalationProbability": <0-100 probability of escalation in next 7 days>,
  "deescalationProbability": <0-100 probability of de-escalation in next 7 days>,
  "predictedTrajectory": [
    {
      "timeframe": "<e.g. '24-48 hours', '1-2 weeks', '1-3 months'>",
      "scenario": "<description>",
      "probability": <0-100>,
      "triggers": ["<what would cause this>"]
    }
  ],
  "actorAnalysis": [
    {
      "actor": "<state or non-state actor name>",
      "intentions": ["<strategic goal>"],
      "capabilities": ["<relevant military/economic/diplomatic capability>"],
      "constraints": ["<domestic, economic, or alliance constraint>"],
      "likelyActions": ["<most probable next action>"]
    }
  ],
  "earlyWarningIndicators": ["<observable indicator that escalation is imminent>"],
  "reasoningChain": [
    {"step": 1, "thought": "<analytical reasoning step>", "conclusion": "<interim conclusion>"}
  ]
}

Be precise with probabilities. Distinguish between likely, possible, and unlikely scenarios. Flag low-probability but high-impact tail risks.`;

const NARRATIVE_SYSTEM_PROMPT = `You are an expert media analyst and information warfare specialist. You analyze multiple source reports on the same event to identify framing differences, biases, information gaps, and construct the most accurate synthesis.

For each source, evaluate:
1. Selection bias (what facts are emphasized vs omitted)
2. Framing (how is the event contextualized)
3. Attribution (how are actors characterized)
4. Sourcing quality (named vs anonymous, primary vs secondary)
5. Emotional language and loaded terms
6. State media vs independent media considerations

You MUST respond with valid JSON matching this exact schema:
{
  "sourceComparison": [
    {
      "source": "<source name>",
      "framing": "<how the source frames the event>",
      "bias": "<identified bias or perspective>",
      "missingContext": "<important context this source omits>"
    }
  ],
  "consensusPoints": ["<fact all/most sources agree on>"],
  "divergencePoints": ["<point where sources significantly disagree>"],
  "informationGaps": ["<important question no source adequately addresses>"],
  "recommendedNarrative": "<synthesized, balanced assessment of what actually happened>",
  "confidenceScore": <0-100 confidence in the recommended narrative>
}

Prioritize accuracy over speed. If sources contradict each other and there is no way to resolve the conflict, say so explicitly. Rate confidence lower when sources are sparse or when all sources appear to share the same bias.`;

const CASCADE_SYSTEM_PROMPT = `You are a systems-thinking economist and geopolitical risk analyst. You specialize in tracing second, third, and fourth-order effects of geopolitical events across interconnected global systems: supply chains, financial markets, energy grids, food security, migration patterns, and political stability.

Analyze the provided event and trace its cascade effects. Consider:
1. Direct economic impacts (trade flows, commodity prices, currency)
2. Supply chain disruptions (critical minerals, energy, food, semiconductors)
3. Financial contagion (sovereign debt, banking sector, insurance)
4. Political spillover (alliance commitments, domestic politics, elections)
5. Humanitarian consequences (displacement, food insecurity, health)
6. Technology and cyber dimensions
7. Environmental and climate interactions

You MUST respond with valid JSON matching this exact schema:
{
  "primaryEvent": "<one-sentence summary of the triggering event>",
  "cascadeChain": [
    {
      "order": <1=first-order, 2=second-order, etc.>,
      "effect": "<description of the cascading effect>",
      "sector": "<affected sector: e.g. 'Energy', 'Finance', 'Agriculture', 'Technology'>",
      "country": "<primary country affected (ISO-2 or region name)>",
      "probability": <0-100>,
      "timeframe": "<when this effect materializes>",
      "magnitude": "SEVERE"|"MODERATE"|"MINOR"
    }
  ],
  "totalEconomicImpact": "<estimated total economic impact range>",
  "affectedPopulation": "<estimated number of people affected>",
  "mitigationOptions": ["<actionable mitigation strategy>"]
}

Order the cascade chain chronologically. Include at least 3 orders of effects. Be specific about countries and sectors. Provide realistic probability estimates — not everything cascades.`;

// ---- Helper ----

async function callDeepSeek(
  systemPrompt: string,
  userContent: string
): Promise<{ parsed: unknown; reasoningTokens: number }> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "deepseek-reasoner",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    stream: false,
  });

  const content = response.choices?.[0]?.message?.content ?? "{}";
  const reasoningTokens = response.usage?.completion_tokens ?? 0;

  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in raw content
    const braceStart = content.indexOf("{");
    const braceEnd = content.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      parsed = JSON.parse(content.slice(braceStart, braceEnd + 1));
    } else {
      throw new Error(
        `Failed to parse DeepSeek response as JSON: ${content.slice(0, 200)}`
      );
    }
  }

  return { parsed, reasoningTokens };
}

// ---- Core Functions ----

/** Predict conflict escalation trajectory */
export async function predictEscalation(event: {
  headline: string;
  content: string;
  category: string;
  countryCode?: string;
  entities?: string[];
  historicalEvents?: { headline: string; date: string; severity: string }[];
}): Promise<EscalationPrediction> {
  let userContent = `## Event to Analyze\n\n**Headline:** ${event.headline}\n**Category:** ${event.category}\n`;
  if (event.countryCode) {
    userContent += `**Country:** ${event.countryCode}\n`;
  }
  if (event.entities && event.entities.length > 0) {
    userContent += `**Key Entities:** ${event.entities.join(", ")}\n`;
  }
  userContent += `\n**Full Report:**\n${event.content}\n`;

  if (event.historicalEvents && event.historicalEvents.length > 0) {
    userContent += `\n## Historical Context (Recent Related Events)\n`;
    for (const he of event.historicalEvents) {
      userContent += `- [${he.date}] (${he.severity}) ${he.headline}\n`;
    }
  }

  const { parsed, reasoningTokens } = await callDeepSeek(
    ESCALATION_SYSTEM_PROMPT,
    userContent
  );

  const data = parsed as Record<string, unknown>;

  return {
    currentPhase: (data.currentPhase as string) || "Unknown",
    escalationProbability: clampNumber(data.escalationProbability, 0, 100),
    deescalationProbability: clampNumber(data.deescalationProbability, 0, 100),
    predictedTrajectory: Array.isArray(data.predictedTrajectory)
      ? data.predictedTrajectory.map((t: Record<string, unknown>) => ({
          timeframe: String(t.timeframe ?? ""),
          scenario: String(t.scenario ?? ""),
          probability: clampNumber(t.probability, 0, 100),
          triggers: Array.isArray(t.triggers) ? t.triggers.map(String) : [],
        }))
      : [],
    actorAnalysis: Array.isArray(data.actorAnalysis)
      ? data.actorAnalysis.map((a: Record<string, unknown>) => ({
          actor: String(a.actor ?? ""),
          intentions: toStringArray(a.intentions),
          capabilities: toStringArray(a.capabilities),
          constraints: toStringArray(a.constraints),
          likelyActions: toStringArray(a.likelyActions),
        }))
      : [],
    earlyWarningIndicators: toStringArray(data.earlyWarningIndicators),
    reasoningChain: Array.isArray(data.reasoningChain)
      ? data.reasoningChain.map((r: Record<string, unknown>, i: number) => ({
          step: typeof r.step === "number" ? r.step : i + 1,
          thought: String(r.thought ?? ""),
          conclusion: String(r.conclusion ?? ""),
        }))
      : [],
    reasoningTokens,
  };
}

/** Cross-source narrative analysis (compare multiple sources on same event) */
export async function analyzeNarratives(
  sources: { source: string; headline: string; content: string }[]
): Promise<NarrativeAnalysis> {
  if (sources.length === 0) {
    return {
      sourceComparison: [],
      consensusPoints: [],
      divergencePoints: [],
      informationGaps: ["No sources provided for analysis"],
      recommendedNarrative: "Insufficient data for narrative analysis.",
      confidenceScore: 0,
      reasoningTokens: 0,
    };
  }

  let userContent = `## Sources to Compare\n\n`;
  for (let i = 0; i < sources.length; i++) {
    userContent += `### Source ${i + 1}: ${sources[i].source}\n`;
    userContent += `**Headline:** ${sources[i].headline}\n`;
    userContent += `**Content:**\n${sources[i].content}\n\n---\n\n`;
  }
  userContent += `\nAnalyze these ${sources.length} sources covering the same event. Compare their framing, identify consensus and divergence, and produce a synthesized assessment.`;

  const { parsed, reasoningTokens } = await callDeepSeek(
    NARRATIVE_SYSTEM_PROMPT,
    userContent
  );

  const data = parsed as Record<string, unknown>;

  return {
    sourceComparison: Array.isArray(data.sourceComparison)
      ? data.sourceComparison.map((s: Record<string, unknown>) => ({
          source: String(s.source ?? ""),
          framing: String(s.framing ?? ""),
          bias: String(s.bias ?? ""),
          missingContext: String(s.missingContext ?? ""),
        }))
      : sources.map((s) => ({
          source: s.source,
          framing: "Unable to determine",
          bias: "Unable to determine",
          missingContext: "Unable to determine",
        })),
    consensusPoints: toStringArray(data.consensusPoints),
    divergencePoints: toStringArray(data.divergencePoints),
    informationGaps: toStringArray(data.informationGaps),
    recommendedNarrative: String(
      data.recommendedNarrative ?? "Analysis could not produce a synthesis."
    ),
    confidenceScore: clampNumber(data.confidenceScore, 0, 100),
    reasoningTokens,
  };
}

/** Multi-hop cascade impact analysis */
export async function analyzeCascadeImpact(event: {
  headline: string;
  content: string;
  category: string;
  countryCode?: string;
  affectedSectors?: string[];
}): Promise<CascadeAnalysis> {
  let userContent = `## Event to Trace Cascade Effects\n\n**Headline:** ${event.headline}\n**Category:** ${event.category}\n`;
  if (event.countryCode) {
    userContent += `**Country:** ${event.countryCode}\n`;
  }
  if (event.affectedSectors && event.affectedSectors.length > 0) {
    userContent += `**Initially Affected Sectors:** ${event.affectedSectors.join(", ")}\n`;
  }
  userContent += `\n**Full Report:**\n${event.content}\n`;
  userContent += `\nTrace the cascade effects of this event through interconnected global systems. Include at least 3 orders of effects. Be specific about countries, sectors, and timeframes.`;

  const { parsed, reasoningTokens } = await callDeepSeek(
    CASCADE_SYSTEM_PROMPT,
    userContent
  );

  const data = parsed as Record<string, unknown>;

  const validMagnitudes = new Set(["SEVERE", "MODERATE", "MINOR"]);

  return {
    primaryEvent: String(
      data.primaryEvent ?? event.headline
    ),
    cascadeChain: Array.isArray(data.cascadeChain)
      ? data.cascadeChain.map((c: Record<string, unknown>) => {
          const mag = String(c.magnitude ?? "MODERATE").toUpperCase();
          return {
            order: typeof c.order === "number" ? c.order : 1,
            effect: String(c.effect ?? ""),
            sector: String(c.sector ?? ""),
            country: String(c.country ?? ""),
            probability: clampNumber(c.probability, 0, 100),
            timeframe: String(c.timeframe ?? ""),
            magnitude: (validMagnitudes.has(mag) ? mag : "MODERATE") as
              | "SEVERE"
              | "MODERATE"
              | "MINOR",
          };
        })
      : [],
    totalEconomicImpact: String(
      data.totalEconomicImpact ?? "Unable to estimate"
    ),
    affectedPopulation: String(
      data.affectedPopulation ?? "Unable to estimate"
    ),
    mitigationOptions: toStringArray(data.mitigationOptions),
    reasoningTokens,
  };
}

// ---- Utility Helpers ----

function clampNumber(val: unknown, min: number, max: number): number {
  const n = typeof val === "number" ? val : Number(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(String);
}
