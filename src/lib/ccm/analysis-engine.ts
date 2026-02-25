import { db } from "@/lib/db";
import { routeLLMRequest } from "@/lib/ccm/llm-router";

/**
 * Runs AI analysis on recent unanalyzed findings for an organization.
 * Uses the organization's configured BYOK LLM provider.
 */
export async function analyzeRecentFindings(organizationId: string): Promise<{
  analyzed: number;
  tokensUsed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let analyzed = 0;
  let tokensUsed = 0;

  // Get findings without AI analysis
  const findings = await db.finding.findMany({
    where: {
      organizationId,
      aiAnalysis: null,
      status: "OPEN",
    },
    include: {
      rule: true,
      dataPoints: {
        include: { dataPoint: { select: { data: true, dataType: true, domain: true } } },
        take: 5,
      },
    },
    take: 20, // Process in batches
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  for (const finding of findings) {
    try {
      const dataSnippets = finding.dataPoints
        .map((dp) => `[${dp.dataPoint.domain}/${dp.dataPoint.dataType}] ${JSON.stringify(dp.dataPoint.data)}`)
        .join("\n");

      const response = await routeLLMRequest(organizationId, {
        systemPrompt: `You are a compliance analyst. Analyze this finding concisely in 2-3 paragraphs:
1. What happened and why it matters
2. Potential business and regulatory impact
3. Recommended immediate action
Be specific and reference the data. Framework: ${finding.framework || finding.rule?.framework || "N/A"}`,
        userPrompt: `Finding: ${finding.title}
Description: ${finding.description}
Severity: ${finding.severity}
Rule: ${finding.rule?.name || "N/A"}
Control: ${finding.controlId || finding.rule?.controlId || "N/A"}

Data:
${dataSnippets}`,
        maxTokens: 1000,
        temperature: 0.2,
      });

      await db.finding.update({
        where: { id: finding.id },
        data: { aiAnalysis: response.content },
      });

      tokensUsed += response.inputTokens + response.outputTokens;
      analyzed++;
    } catch (err) {
      errors.push(`Finding ${finding.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { analyzed, tokensUsed, errors };
}
