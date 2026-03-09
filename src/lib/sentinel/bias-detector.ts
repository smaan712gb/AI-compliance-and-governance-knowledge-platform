// ============================================
// SENTINEL — Llama-3 Bias Guardrail System
// ============================================

import OpenAI from "openai";
import type { BiasAuditRequest, BiasAuditResult, BiasType } from "./types";

let _client: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "",
    });
  }
  return _client;
}

const SENSITIVE_REGIONS = [
  "taiwan", "south china sea", "tibet", "xinjiang", "hong kong",
  "crimea", "kashmir", "palestine", "israel", "western sahara",
  "south ossetia", "abkhazia", "transnistria", "nagorno-karabakh",
  "donbas", "donetsk", "luhansk", "zaporizhzhia", "kherson",
];

const SENSITIVE_TOPICS = [
  "territorial dispute", "sovereignty", "independence",
  "human rights", "genocide", "ethnic cleansing",
  "election interference", "election fraud",
  "cyber espionage", "state-sponsored",
  "nuclear program", "weapons of mass destruction",
  "sanctions evasion", "regime change",
];

const BIAS_SYSTEM_PROMPT = `You are a media bias auditor specializing in geopolitical reporting.
Analyze the provided article for potential bias in coverage of sensitive geopolitical topics.

You MUST respond with valid JSON:
{
  "hasBias": true|false,
  "confidence": <0.0-1.0>,
  "biasType": "omission"|"framing"|"emphasis"|"attribution"|null,
  "explanation": "<detailed explanation of detected bias or lack thereof>",
  "alternativeFraming": "<suggested neutral alternative>" | null,
  "recommendation": "accept"|"flag"|"override"
}

Bias types:
- omission: Key facts or perspectives deliberately excluded
- framing: Language or structure that favors one narrative
- emphasis: Disproportionate focus on certain aspects
- attribution: Unbalanced source attribution or crediting

Scoring:
- accept: No significant bias detected (confidence < 0.3)
- flag: Moderate bias warranting editorial review (0.3-0.7)
- override: Strong bias requiring rewrite or context addition (> 0.7)`;

export function detectSensitiveContent(
  headline: string,
  content: string,
  region?: string
): { sensitiveRegion: boolean; sensitiveTopic: boolean } {
  const text = `${headline} ${content} ${region || ""}`.toLowerCase();

  const sensitiveRegion = SENSITIVE_REGIONS.some((r) => text.includes(r));
  const sensitiveTopic = SENSITIVE_TOPICS.some((t) => text.includes(t));

  return { sensitiveRegion, sensitiveTopic };
}

export async function auditBias(
  request: BiasAuditRequest
): Promise<BiasAuditResult> {
  const { sensitiveRegion, sensitiveTopic } = detectSensitiveContent(
    request.headline,
    request.content,
    request.region
  );

  // If not sensitive, return clean result without calling the model
  if (!sensitiveRegion && !sensitiveTopic) {
    return {
      hasBias: false,
      confidence: 0,
      biasType: null,
      explanation: "Content does not involve sensitive geopolitical regions or topics.",
      alternativeFraming: null,
      recommendation: "accept",
      sensitiveRegion: false,
      sensitiveTopic: false,
    };
  }

  const client = getGroqClient();

  const userPrompt = `**HEADLINE**: ${request.headline}
**SOURCE**: ${request.source}
**REGION**: ${request.region || "Not specified"}

**CONTENT**:
${request.content.slice(0, 3000)}

Analyze this article for geopolitical bias.`;

  const completion = await client.chat.completions.create({
    model: process.env.GROQ_BIAS_MODEL || "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: BIAS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from bias detection model");
  }

  return parseBiasResult(content, sensitiveRegion, sensitiveTopic);
}

export function parseBiasResult(
  raw: string,
  sensitiveRegion: boolean,
  sensitiveTopic: boolean
): BiasAuditResult {
  const parsed = JSON.parse(raw);

  const validBiasTypes: BiasType[] = ["omission", "framing", "emphasis", "attribution"];
  const validRecommendations = ["accept", "flag", "override"] as const;

  const biasType =
    parsed.biasType && validBiasTypes.includes(parsed.biasType)
      ? parsed.biasType
      : null;

  const recommendation =
    validRecommendations.includes(parsed.recommendation)
      ? parsed.recommendation
      : "flag";

  return {
    hasBias: Boolean(parsed.hasBias),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    biasType,
    explanation: String(parsed.explanation || ""),
    alternativeFraming: parsed.alternativeFraming
      ? String(parsed.alternativeFraming)
      : null,
    recommendation,
    sensitiveRegion,
    sensitiveTopic,
  };
}
