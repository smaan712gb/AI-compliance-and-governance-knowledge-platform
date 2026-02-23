import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import {
  ERP_ANALYSIS_SYSTEM_PROMPT,
  buildERPAnalysisUserPrompt,
} from "./erp-analysis-prompts";
import {
  analyzeERPGaps,
  ERP_SYSTEMS,
  type StaticGapAnalysis,
} from "@/lib/constants/erp-data";
import type { AgentResult } from "./types";

// ============================================
// ERP ANALYSIS RESULT TYPES
// ============================================

export interface ERPRegulationSummary {
  id: string;
  name: string;
  domain: string;
  jurisdiction: string;
  deadline: string | null;
  coverage: "NATIVE" | "ADDON" | "PARTNER" | "GAP";
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  summary: string;
}

export interface ERPGapDetail {
  regulationId: string;
  regulationName: string;
  coverage: "GAP" | "PARTNER" | "ADDON";
  currentState: string;
  requiredState: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  estimatedCost: string;
  recommendedApproach: string;
}

export interface ERPVendorRecommendation {
  regulationId: string;
  vendorName: string;
  vendorType: string;
  rationale: string;
  integrationComplexity: "LOW" | "MEDIUM" | "HIGH";
  estimatedTimeline: string;
}

export interface ERPAnalysisResult {
  applicableRegulations: ERPRegulationSummary[];
  gapAnalysis: ERPGapDetail[];
  vendorRecommendations: ERPVendorRecommendation[];
  actionPlan: string;
  staticAnalysis: StaticGapAnalysis;
}

export interface ERPAnalysisInput {
  erpSystem: string;
  countries: string[];
  industry: string;
  userId?: string;
  companyId?: string;
}

// ============================================
// MAIN AGENT FUNCTION
// ============================================

/**
 * Run a full ERP compliance impact analysis:
 * 1. Static gap analysis using erp-data.ts
 * 2. Fetch relevant vendors from DB
 * 3. Call DeepSeek reasoner for AI-enhanced analysis
 * 4. Save ERPAnalysis record in DB
 * 5. Return structured result
 */
export async function runERPAnalysis(
  input: ERPAnalysisInput,
): Promise<AgentResult<ERPAnalysisResult>> {
  const { erpSystem, countries, industry, userId, companyId } = input;

  try {
    // Step 1: Run static gap analysis
    const staticAnalysis = analyzeERPGaps(erpSystem, countries, industry);

    // Step 2: Fetch relevant vendors from DB for recommendations
    // Look for vendors in e-invoicing, tax compliance, cybersecurity, and compliance automation categories
    const relevantCategories = [
      "E_INVOICING",
      "TAX_COMPLIANCE",
      "COMPLIANCE_AUTOMATION",
      "GRC_PLATFORM",
      "SECURITY_POSTURE",
      "PRIVACY_COMPLIANCE",
      "ESG_REPORTING",
    ];

    const vendors = await db.vendor.findMany({
      where: {
        isPublished: true,
        category: { in: relevantCategories as never[] },
      },
      select: {
        name: true,
        slug: true,
        category: true,
        shortDescription: true,
      },
      orderBy: { overallScore: "desc" },
      take: 30,
    });

    const vendorNames = vendors.map(
      (v) => `${v.name} (${v.category.replace(/_/g, " ").toLowerCase()})`,
    );

    // Step 3: Get ERP display name
    const erpData = ERP_SYSTEMS[erpSystem];
    const erpSystemName = erpData?.name || erpSystem;

    // Step 4: Call DeepSeek reasoner for enhanced analysis
    const userPrompt = buildERPAnalysisUserPrompt(
      erpSystemName,
      countries,
      industry,
      staticAnalysis,
      vendorNames,
    );

    const deepseekResult = await callDeepSeek({
      systemPrompt: ERP_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      model: "deepseek-reasoner",
      maxTokens: 8000,
      jsonMode: false, // Reasoner doesn't support json_mode
      enableFallback: true,
    });

    // Step 5: Parse the AI response
    const aiResult = parseJsonResponse<{
      applicableRegulations: ERPRegulationSummary[];
      gapAnalysis: ERPGapDetail[];
      vendorRecommendations: ERPVendorRecommendation[];
      actionPlan: string;
    }>(deepseekResult.content);

    // Step 6: Save to DB
    const primaryCountry = countries[0] || "GLOBAL";

    await db.eRPAnalysis.create({
      data: {
        companyId: companyId || null,
        userId: userId || null,
        erpSystem,
        country: primaryCountry,
        countries,
        industry,
        regulations: JSON.parse(JSON.stringify(aiResult.applicableRegulations)),
        gapAnalysis: JSON.parse(JSON.stringify(aiResult.gapAnalysis)),
        recommendations: JSON.parse(JSON.stringify(aiResult.vendorRecommendations)),
        actionPlan: aiResult.actionPlan,
        status: "COMPLETED",
        tokensUsed: deepseekResult.totalTokens,
        costUsd: deepseekResult.costUsd,
      },
    });

    // Step 7: Return result
    return {
      success: true,
      data: {
        applicableRegulations: aiResult.applicableRegulations,
        gapAnalysis: aiResult.gapAnalysis,
        vendorRecommendations: aiResult.vendorRecommendations,
        actionPlan: aiResult.actionPlan,
        staticAnalysis,
      },
      tokensUsed: deepseekResult.totalTokens,
      costUsd: deepseekResult.costUsd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ERP Analysis Agent] Error:", message);

    // Try to save failed analysis record
    try {
      await db.eRPAnalysis.create({
        data: {
          companyId: companyId || null,
          userId: userId || null,
          erpSystem,
          country: countries[0] || "GLOBAL",
          countries,
          industry,
          regulations: [],
          gapAnalysis: [],
          recommendations: [],
          actionPlan: null,
          status: "FAILED",
          tokensUsed: 0,
          costUsd: 0,
        },
      });
    } catch (dbError) {
      console.error(
        "[ERP Analysis Agent] Failed to save error record:",
        dbError instanceof Error ? dbError.message : String(dbError),
      );
    }

    return {
      success: false,
      error: message,
      tokensUsed: 0,
      costUsd: 0,
    };
  }
}
