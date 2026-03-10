import { db } from "@/lib/db";
import { routeLLMRequestWithBudget } from "@/lib/ccm/llm-router";
import { reasonAboutFinding } from "@/lib/ccm/reasoning-engine";
import { trackTokenUsage, checkTokenBudget } from "@/lib/ccm/token-budget";

/**
 * Runs AI analysis on recent unanalyzed findings for an organization.
 *
 * - CRITICAL/HIGH findings: Uses DeepSeek R1 deep reasoning (full chain-of-thought)
 * - MEDIUM/LOW/INFO findings: Uses standard BYOK LLM with structured output
 *
 * Stores the full reasoning result as JSON in aiAnalysis for CRITICAL/HIGH,
 * and structured text for others. Checks budget before each analysis.
 */
export async function analyzeRecentFindings(organizationId: string): Promise<{
  analyzed: number;
  tokensUsed: number;
  errors: string[];
  severityMismatches: { findingId: string; ruleSeverity: string; aiSeverity: string }[];
}> {
  const errors: string[] = [];
  const severityMismatches: { findingId: string; ruleSeverity: string; aiSeverity: string }[] = [];
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
        include: {
          dataPoint: { select: { data: true, dataType: true, domain: true } },
        },
        take: 10,
      },
    },
    take: 20, // Process in batches
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  for (const finding of findings) {
    try {
      // Check budget before each analysis
      const estimatedTokens =
        finding.severity === "CRITICAL" || finding.severity === "HIGH"
          ? 12000 // Reasoning uses more tokens
          : 5000;

      const budget = await checkTokenBudget(organizationId, estimatedTokens);
      if (budget.recommendedAction === "BLOCK") {
        errors.push(
          `Budget exhausted — skipping finding ${finding.id}. Daily: ${budget.dailyUsed}/${budget.dailyLimit}`
        );
        continue;
      }

      // Fetch historical findings for the same rule to detect patterns
      let historicalFindings: {
        title: string;
        severity: string;
        status: string;
        createdAt: Date;
      }[] = [];

      if (finding.ruleId) {
        const historical = await db.finding.findMany({
          where: {
            ruleId: finding.ruleId,
            organizationId,
            id: { not: finding.id },
          },
          select: {
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        historicalFindings = historical.map((h) => ({
          title: h.title,
          severity: h.severity,
          status: h.status,
          createdAt: h.createdAt,
        }));
      }

      const dataPoints = finding.dataPoints.map((dp) => ({
        domain: dp.dataPoint.domain,
        dataType: dp.dataPoint.dataType,
        data: dp.dataPoint.data,
      }));

      if (finding.severity === "CRITICAL" || finding.severity === "HIGH") {
        // ---- Deep reasoning for CRITICAL/HIGH findings ----
        const result = await reasonAboutFinding({
          id: finding.id,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          framework: finding.framework || finding.rule?.framework,
          controlId: finding.controlId || finding.rule?.controlId || undefined,
          ruleName: finding.rule?.name,
          ruleDefinition: finding.rule?.ruleDefinition,
          dataPoints,
          historicalFindings,
        });

        // Store full reasoning result as JSON string
        await db.finding.update({
          where: { id: finding.id },
          data: {
            aiAnalysis: JSON.stringify({
              type: "deep_reasoning",
              rootCause: result.rootCause,
              riskAssessment: result.riskAssessment,
              reasoningChain: result.reasoningChain,
              controlMapping: result.controlMapping,
              recommendations: result.recommendations,
              aiSeverity: result.aiSeverity,
              severityJustification: result.severityJustification,
              patterns: result.patterns,
              analyzedAt: new Date().toISOString(),
            }),
          },
        });

        // Track token usage for reasoning
        await trackTokenUsage(organizationId, {
          inputTokens: Math.floor(result.reasoningTokens * 0.6),
          outputTokens: Math.floor(result.reasoningTokens * 0.4),
          reasoningTokens: result.reasoningTokens,
          model: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
          provider: "DEEPSEEK",
          operation: "reasoning",
        });

        tokensUsed += result.reasoningTokens;

        // Check if AI severity disagrees with rule severity
        if (result.aiSeverity !== finding.severity) {
          severityMismatches.push({
            findingId: finding.id,
            ruleSeverity: finding.severity,
            aiSeverity: result.aiSeverity,
          });
          // Log mismatch for review but do NOT auto-change severity
          console.warn(
            `[CCM] Severity mismatch for finding ${finding.id}: rule=${finding.severity}, AI=${result.aiSeverity}. Flagged for review.`
          );
        }
      } else {
        // ---- Standard analysis for MEDIUM/LOW/INFO findings ----
        const dataSnippets = dataPoints
          .map(
            (dp) =>
              `[${dp.domain}/${dp.dataType}] ${JSON.stringify(dp.data)}`
          )
          .join("\n");

        const historicalContext =
          historicalFindings.length > 0
            ? `\n\nHistorical findings for same rule (${historicalFindings.length}):\n` +
              historicalFindings
                .map(
                  (h) =>
                    `- "${h.title}" | ${h.severity} | ${h.status} | ${h.createdAt.toISOString().split("T")[0]}`
                )
                .join("\n")
            : "";

        const response = await routeLLMRequestWithBudget(
          organizationId,
          {
            systemPrompt: `You are a compliance analyst. Analyze this finding and respond with valid JSON:
{
  "type": "standard_analysis",
  "summary": "<2-3 sentence summary of what happened and why it matters>",
  "impact": "<business and regulatory impact assessment>",
  "immediateAction": "<recommended immediate action>",
  "rootCauseCategory": "<PROCESS_FAILURE|CONTROL_GAP|HUMAN_ERROR|SYSTEM_MISCONFIGURATION|POLICY_VIOLATION|DATA_INTEGRITY|ACCESS_VIOLATION>",
  "aiSeverity": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "isRecurring": <true|false based on historical findings>
}
Framework context: ${finding.framework || finding.rule?.framework || "N/A"}
Be specific and reference the data provided.`,
            userPrompt: `Finding: ${finding.title}
Description: ${finding.description}
Severity: ${finding.severity}
Rule: ${finding.rule?.name || "N/A"}
Control: ${finding.controlId || finding.rule?.controlId || "N/A"}

Data:
${dataSnippets}${historicalContext}`,
            maxTokens: 1500,
            temperature: 0.2,
          },
          "analysis"
        );

        // Try to parse structured JSON; fall back to raw text
        let analysisContent: string;
        try {
          const parsed = JSON.parse(
            response.content.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim()
          );
          // Add metadata
          parsed.analyzedAt = new Date().toISOString();
          analysisContent = JSON.stringify(parsed);

          // Check severity mismatch
          if (parsed.aiSeverity && parsed.aiSeverity !== finding.severity) {
            severityMismatches.push({
              findingId: finding.id,
              ruleSeverity: finding.severity,
              aiSeverity: parsed.aiSeverity,
            });
            console.warn(
              `[CCM] Severity mismatch for finding ${finding.id}: rule=${finding.severity}, AI=${parsed.aiSeverity}. Flagged for review.`
            );
          }
        } catch {
          // If JSON parsing fails, store the raw text with metadata wrapper
          analysisContent = JSON.stringify({
            type: "standard_analysis",
            summary: response.content,
            analyzedAt: new Date().toISOString(),
          });
        }

        await db.finding.update({
          where: { id: finding.id },
          data: { aiAnalysis: analysisContent },
        });

        tokensUsed += response.inputTokens + response.outputTokens;
      }

      analyzed++;
    } catch (err) {
      errors.push(
        `Finding ${finding.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { analyzed, tokensUsed, errors, severityMismatches };
}
