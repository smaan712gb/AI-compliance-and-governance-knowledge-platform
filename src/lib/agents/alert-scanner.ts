import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import {
  ALERT_SCANNER_SYSTEM_PROMPT,
  buildAlertScannerUserPrompt,
} from "./alert-prompts";
import type { AgentResult } from "./types";

// ============================================
// ALERT SCANNER AGENT
// ============================================
// Scans recent EvidenceCards and creates RegulatoryAlert records
// for cards that represent regulatory changes.

interface AlertScanResult {
  evidenceScanned: number;
  alertsCreated: number;
  errors: string[];
}

interface AlertScanResponse {
  isRegulatoryChange: boolean;
  alert?: {
    title: string;
    summary: string;
    regulation: string;
    jurisdiction: string;
    regulatoryBody: string;
    changeType: string;
    urgency: string;
    domain: string;
    effectiveDate: string | null;
    actionRequired: string;
    affectedIndustries: string[];
    affectedCountries: string[];
  };
}

export async function runAlertScanner(
  model: string = "deepseek-chat",
): Promise<AgentResult<AlertScanResult>> {
  const errors: string[] = [];
  let totalTokens = 0;
  let totalCost = 0;
  let alertsCreated = 0;

  try {
    // ── 1. Find evidence cards from last 24 hours not already linked to an alert ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get IDs of evidence cards that already have a RegulatoryAlert linked
    const existingAlertEvidenceIds = await db.regulatoryAlert.findMany({
      where: { evidenceCardId: { not: null } },
      select: { evidenceCardId: true },
    });

    const linkedEvidenceIds = existingAlertEvidenceIds
      .map((a) => a.evidenceCardId)
      .filter((id): id is string => id !== null);

    const recentCards = await db.evidenceCard.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        ...(linkedEvidenceIds.length > 0
          ? { id: { notIn: linkedEvidenceIds } }
          : {}),
      },
      orderBy: { relevanceScore: "desc" },
    });

    console.log(
      `[AlertScanner] Found ${recentCards.length} unscanned evidence cards from last 24 hours`,
    );

    if (recentCards.length === 0) {
      return {
        success: true,
        data: { evidenceScanned: 0, alertsCreated: 0, errors: [] },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // ── 2. Process each card sequentially through DeepSeek ─────────────
    for (const card of recentCards) {
      try {
        const keyFindings = Array.isArray(card.keyFindings)
          ? (card.keyFindings as string[])
          : [];

        const userPrompt = buildAlertScannerUserPrompt(
          card.title,
          card.summary,
          keyFindings,
          card.category,
          card.tags,
        );

        const response = await callDeepSeek({
          systemPrompt: ALERT_SCANNER_SYSTEM_PROMPT,
          userPrompt,
          model,
          temperature: 0.2,
          maxTokens: 2000,
          jsonMode: true,
        });

        totalTokens += response.totalTokens;
        totalCost += response.costUsd;

        const parsed = parseJsonResponse<AlertScanResponse>(response.content);

        if (!parsed.isRegulatoryChange || !parsed.alert) {
          console.log(
            `[AlertScanner] Card "${card.title.slice(0, 50)}..." is not a regulatory change — skipping`,
          );
          continue;
        }

        // ── 3. Create RegulatoryAlert record ───────────────────────────
        const alertData = parsed.alert;

        await db.regulatoryAlert.create({
          data: {
            title: alertData.title,
            summary: alertData.summary,
            regulation: alertData.regulation,
            jurisdiction: alertData.jurisdiction,
            regulatoryBody: alertData.regulatoryBody,
            changeType: alertData.changeType,
            urgency: alertData.urgency,
            domain: alertData.domain,
            effectiveDate: alertData.effectiveDate
              ? new Date(alertData.effectiveDate)
              : null,
            sourceUrl: card.url,
            actionRequired: alertData.actionRequired,
            affectedIndustries: alertData.affectedIndustries,
            affectedCountries: alertData.affectedCountries,
            evidenceCardId: card.id,
          },
        });

        alertsCreated++;
        console.log(
          `[AlertScanner] Created alert: "${alertData.title}" (${alertData.urgency} / ${alertData.changeType})`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Card "${card.title.slice(0, 60)}": ${message}`);
        console.log(
          `[AlertScanner] Error processing card "${card.title.slice(0, 50)}...": ${message}`,
        );
      }
    }

    console.log(
      `[AlertScanner] Complete — scanned ${recentCards.length} cards, created ${alertsCreated} alerts`,
    );

    return {
      success: errors.length === 0,
      data: {
        evidenceScanned: recentCards.length,
        alertsCreated,
        errors,
      },
      error: errors.length > 0 ? errors.join("; ") : undefined,
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[AlertScanner] Fatal error: ${message}`);
    return {
      success: false,
      data: { evidenceScanned: 0, alertsCreated, errors: [message] },
      error: message,
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
