export interface ComplianceAssessment {
  riskLevel: "unacceptable" | "high" | "gpai" | "limited" | "minimal";
  riskJustification: string;
  obligations: {
    id: string;
    title: string;
    article: string;
    description: string;
    priority: "critical" | "high" | "medium" | "low";
    deadline?: string;
    actionItems: string[];
  }[];
  timeline: {
    date: string;
    title: string;
    description: string;
    status: "overdue" | "urgent" | "upcoming" | "future";
  }[];
  controls: {
    id: string;
    title: string;
    description: string;
    category: "technical" | "organizational" | "documentation" | "process";
    effort: "low" | "medium" | "high";
    relatedFrameworks: string[];
  }[];
  warnings: string[];
  nextSteps: string[];
}

export function parseComplianceResponse(
  rawResponse: string
): ComplianceAssessment | null {
  try {
    // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : rawResponse.trim();
    return JSON.parse(jsonString) as ComplianceAssessment;
  } catch {
    // Try to find JSON object directly
    try {
      const start = rawResponse.indexOf("{");
      const end = rawResponse.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        return JSON.parse(rawResponse.slice(start, end + 1)) as ComplianceAssessment;
      }
    } catch {
      // Return null if we can't parse at all
    }
    return null;
  }
}
