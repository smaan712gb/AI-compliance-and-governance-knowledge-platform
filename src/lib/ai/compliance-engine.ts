import type { ComplianceCheckInput } from "@/lib/validators/compliance-check";
import {
  AI_SYSTEM_TYPES,
  HIGH_RISK_OBLIGATIONS,
  GPAI_OBLIGATIONS,
  LIMITED_RISK_OBLIGATIONS,
  AI_ACT_TIMELINE,
  PENALTIES,
} from "@/lib/constants/ai-act-data";

const COMPLIANCE_SYSTEM_PROMPT = `You are an expert EU AI Act compliance advisor. Your role is to analyze an organization's AI system and provide a detailed, accurate compliance assessment.

You MUST respond in the following JSON structure:
{
  "riskLevel": "unacceptable" | "high" | "gpai" | "limited" | "minimal",
  "riskJustification": "Brief explanation of why this risk level applies",
  "obligations": [
    {
      "id": "string",
      "title": "string",
      "article": "EU AI Act article reference",
      "description": "What this obligation requires",
      "priority": "critical" | "high" | "medium" | "low",
      "deadline": "ISO date string",
      "actionItems": ["specific action item 1", "specific action item 2"]
    }
  ],
  "timeline": [
    {
      "date": "ISO date string",
      "title": "string",
      "description": "What needs to happen by this date",
      "status": "overdue" | "urgent" | "upcoming" | "future"
    }
  ],
  "controls": [
    {
      "id": "string",
      "title": "Recommended control",
      "description": "Description of what to implement",
      "category": "technical" | "organizational" | "documentation" | "process",
      "effort": "low" | "medium" | "high",
      "relatedFrameworks": ["SOC2:CC3.1", "ISO27001:A.8.25"]
    }
  ],
  "warnings": ["Any critical warnings or red flags"],
  "nextSteps": ["Recommended immediate next steps"]
}

Rules:
- Be specific and actionable. Generic advice is not helpful.
- Reference specific EU AI Act articles for every obligation.
- Tailor the assessment to the user's specific role, system type, geography, and use case.
- If the system could be classified at different risk levels depending on specifics, explain the conditions.
- Flag any prohibited practices (Article 5) immediately.
- Consider the current date relative to the EU AI Act timeline when setting statuses.
- For GPAI models, distinguish between standard obligations and systemic risk obligations.
- Include cross-references to SOC 2, ISO 27001, NIST AI RMF where relevant.`;

export function buildCompliancePrompt(input: ComplianceCheckInput): string {
  const systemType = AI_SYSTEM_TYPES.find((t) => t.id === input.systemType);

  return `Analyze the following AI system for EU AI Act compliance:

**Role:** ${input.role} (${getRoleDescription(input.role)})
**AI System Type:** ${systemType?.label || input.systemType}
${systemType ? `**Default Risk Classification:** ${systemType.riskLevel}` : ""}
**Geography:** ${input.geography.join(", ")}
**Use Case:** ${input.useCase}
${input.useCaseCategory ? `**Use Case Category:** ${input.useCaseCategory}` : ""}
${input.additionalContext ? `**Additional Context:** ${input.additionalContext}` : ""}
${input.isGPAIWithSystemicRisk !== undefined ? `**GPAI with Systemic Risk:** ${input.isGPAIWithSystemicRisk ? "Yes" : "No/Unknown"}` : ""}
${input.companySize ? `**Company Size:** ${input.companySize}` : ""}

**Current Date:** ${new Date().toISOString().split("T")[0]}

Please provide a comprehensive compliance assessment following the JSON structure specified in your instructions. Be specific to this exact use case and role.`;
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    provider:
      "Develops or has an AI system developed and places it on the market under own name/trademark",
    deployer:
      "Uses an AI system under their authority in a professional capacity",
    importer:
      "Places on the EU market an AI system bearing the name of a non-EU provider",
    distributor:
      "Makes an AI system available on the EU market without modifying it",
  };
  return descriptions[role] || role;
}

// Pre-compute obligations based on risk level without AI
export function getStaticObligations(
  riskLevel: string,
  role: string,
  isSystemicRisk: boolean = false
) {
  switch (riskLevel) {
    case "unacceptable":
      return {
        obligations: [
          {
            id: "prohibition",
            title: "PROHIBITED - System Cannot Be Used",
            article: "Article 5",
            description:
              "This AI system falls under prohibited practices and cannot be placed on the market, put into service, or used in the EU.",
            priority: "critical" as const,
          },
        ],
        penalties: PENALTIES.prohibited_practices,
      };

    case "high":
      return {
        obligations:
          role === "provider" || role === "importer"
            ? HIGH_RISK_OBLIGATIONS.provider
            : HIGH_RISK_OBLIGATIONS.deployer,
        penalties: PENALTIES.high_risk_violations,
      };

    case "gpai":
      return {
        obligations: isSystemicRisk
          ? GPAI_OBLIGATIONS
          : GPAI_OBLIGATIONS.filter((o) => !o.forSystemicRisk),
        penalties: PENALTIES.high_risk_violations,
      };

    case "limited":
      return {
        obligations: LIMITED_RISK_OBLIGATIONS,
        penalties: PENALTIES.incorrect_information,
      };

    case "minimal":
      return {
        obligations: [],
        penalties: null,
      };

    default:
      return { obligations: [], penalties: null };
  }
}

export function getRelevantTimeline(riskLevel: string) {
  const now = new Date();
  return AI_ACT_TIMELINE.map((event) => {
    const eventDate = new Date(event.date);
    let status = event.status;

    if (eventDate < now) {
      status = "completed";
    } else if (eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
      status = "active";
    }

    return { ...event, status };
  });
}

export { COMPLIANCE_SYSTEM_PROMPT };
