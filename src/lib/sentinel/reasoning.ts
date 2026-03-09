// ============================================
// SENTINEL — DeepSeek R1 Reasoning Engine
// ============================================

import OpenAI from "openai";
import type {
  ReasoningRequest,
  ReasoningResponse,
  EventCategory,
  EventSeverity,
} from "./types";

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

const REASONING_SYSTEM_PROMPT = `You are SENTINEL, an elite geopolitical intelligence analyst.
Analyze the provided event and produce a structured intelligence assessment.

You MUST respond with valid JSON matching this exact schema:
{
  "category": "CONFLICT"|"TERRORISM"|"CYBER"|"ECONOMIC"|"POLITICAL"|"DISASTER"|"SANCTIONS"|"OTHER",
  "severity": "critical"|"high"|"medium"|"low"|"info",
  "riskScore": <0-100>,
  "reasoning": {
    "whatHappened": "<concise factual summary>",
    "whyItMatters": "<strategic significance>",
    "whatHappensNext": "<likely developments>",
    "whoIsAffected": "<affected parties and stakeholders>"
  },
  "impactAnalysis": {
    "primaryImpact": "<main consequence>",
    "secondOrderEffects": ["<effect1>", "<effect2>"],
    "affectedSectors": ["<sector1>", "<sector2>"],
    "affectedCountries": ["<ISO-2 code1>", "<ISO-2 code2>"]
  },
  "actionableInsights": ["<insight1>", "<insight2>"],
  "entities": ["<entity1>", "<entity2>"]
}

Scoring guide:
- 90-100: Imminent threat to life, critical infrastructure, or global markets
- 70-89: Significant regional destabilization or major economic disruption
- 50-69: Notable tension escalation or moderate economic impact
- 30-49: Localized incidents with limited broader implications
- 0-29: Routine monitoring, informational value only`;

export async function analyzeEvent(
  request: ReasoningRequest
): Promise<ReasoningResponse> {
  const client = getClient();

  const userPrompt = buildUserPrompt(request);

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
    messages: [
      { role: "system", content: REASONING_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from reasoning model");
  }

  const parsed = parseReasoningResponse(content);

  const reasoningTokens =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0);

  return {
    ...parsed,
    reasoningTokens,
  };
}

function buildUserPrompt(request: ReasoningRequest): string {
  let prompt = `**HEADLINE**: ${request.headline}\n\n`;
  prompt += `**CONTENT**: ${request.content}\n\n`;

  if (request.source) {
    prompt += `**SOURCE**: ${request.source}\n\n`;
  }
  if (request.countryCode) {
    prompt += `**COUNTRY**: ${request.countryCode}\n\n`;
  }
  if (request.context) {
    prompt += `**ADDITIONAL CONTEXT**: ${request.context}\n\n`;
  }

  prompt += "Analyze this event and provide your intelligence assessment as JSON.";
  return prompt;
}

export function parseReasoningResponse(raw: string): Omit<ReasoningResponse, "reasoningTokens"> {
  // Extract JSON from potential markdown code blocks
  let jsonStr = raw;
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Try to find JSON object in the response
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    throw new Error("No JSON object found in reasoning response");
  }

  const parsed = JSON.parse(objMatch[0]);

  // Validate and normalize
  const validCategories: EventCategory[] = [
    "CONFLICT", "TERRORISM", "CYBER", "ECONOMIC",
    "POLITICAL", "DISASTER", "SANCTIONS", "OTHER",
  ];
  const validSeverities: EventSeverity[] = ["critical", "high", "medium", "low", "info"];

  const category = validCategories.includes(parsed.category)
    ? parsed.category
    : "OTHER";

  const severity = validSeverities.includes(parsed.severity)
    ? parsed.severity
    : "medium";

  const riskScore = Math.max(0, Math.min(100, Number(parsed.riskScore) || 50));

  return {
    category,
    severity,
    riskScore,
    reasoning: {
      whatHappened: String(parsed.reasoning?.whatHappened || ""),
      whyItMatters: String(parsed.reasoning?.whyItMatters || ""),
      whatHappensNext: String(parsed.reasoning?.whatHappensNext || ""),
      whoIsAffected: String(parsed.reasoning?.whoIsAffected || ""),
    },
    impactAnalysis: {
      primaryImpact: String(parsed.impactAnalysis?.primaryImpact || ""),
      secondOrderEffects: Array.isArray(parsed.impactAnalysis?.secondOrderEffects)
        ? parsed.impactAnalysis.secondOrderEffects.map(String)
        : [],
      affectedSectors: Array.isArray(parsed.impactAnalysis?.affectedSectors)
        ? parsed.impactAnalysis.affectedSectors.map(String)
        : [],
      affectedCountries: Array.isArray(parsed.impactAnalysis?.affectedCountries)
        ? parsed.impactAnalysis.affectedCountries.map(String)
        : [],
    },
    actionableInsights: Array.isArray(parsed.actionableInsights)
      ? parsed.actionableInsights.map(String)
      : [],
    entities: Array.isArray(parsed.entities)
      ? parsed.entities.map(String)
      : [],
  };
}
