import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import {
  VENDOR_ASSESSMENT_SYSTEM_PROMPT,
  buildVendorAssessmentUserPrompt,
} from "./vendor-assessment-prompts";
import type { AgentResult } from "./types";

// ============================================
// VENDOR ASSESSMENT RESULT TYPES
// ============================================

export interface DimensionDetail {
  score: number;
  strengths: string[];
  weaknesses: string[];
  dataConfidence: "high" | "medium" | "low";
  notes: string;
}

export interface VendorAssessmentDimensions {
  security: DimensionDetail;
  privacy: DimensionDetail;
  compliance: DimensionDetail;
  financial: DimensionDetail;
  productFit: DimensionDetail;
}

export interface VendorAssessmentResult {
  assessmentId: string;
  vendorId: string;
  vendorName: string;
  overallScore: number;
  securityScore: number;
  privacyScore: number;
  complianceScore: number;
  financialScore: number;
  productFitScore: number;
  dimensions: VendorAssessmentDimensions;
  findings: string;
  recommendation: string;
}

interface DeepSeekAssessmentResponse {
  overallScore: number;
  securityScore: number;
  privacyScore: number;
  complianceScore: number;
  financialScore: number;
  productFitScore: number;
  dimensions: VendorAssessmentDimensions;
  findings: string;
  recommendation: string;
}

// ============================================
// VENDOR ASSESSMENT AGENT
// ============================================

/**
 * Run a comprehensive AI-powered vendor assessment using DeepSeek Reasoner.
 *
 * 1. Fetches vendor from DB with all fields
 * 2. Calls DeepSeek Reasoner for deep analysis
 * 3. Parses response into VendorAssessmentResult
 * 4. Creates VendorAssessment record in DB
 * 5. Updates Vendor.overallScore with new assessment score
 * 6. Returns AgentResult<VendorAssessmentResult>
 */
export async function runVendorAssessment(
  vendorId: string,
  triggeredBy: string = "admin",
): Promise<AgentResult<VendorAssessmentResult>> {
  // 1. Fetch vendor from DB with ALL fields
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    return {
      success: false,
      error: `Vendor not found: ${vendorId}`,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  // 2. Create a pending assessment record
  const assessment = await db.vendorAssessment.create({
    data: {
      vendorId: vendor.id,
      assessmentType: "AI_FULL_ASSESSMENT",
      status: "RUNNING",
      triggeredBy,
    },
  });

  try {
    // 3. Build the prompt with vendor data
    const userPrompt = buildVendorAssessmentUserPrompt({
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      shortDescription: vendor.shortDescription,
      websiteUrl: vendor.websiteUrl,
      category: vendor.category,
      subcategories: vendor.subcategories,
      pricingModel: vendor.pricingModel,
      pricingStartsAt: vendor.pricingStartsAt,
      pricingDetails: vendor.pricingDetails,
      hasFreeTrialOrTier: vendor.hasFreeTrialOrTier,
      frameworksSupported: vendor.frameworksSupported,
      deploymentsSupported: vendor.deploymentsSupported,
      integrationsSupported: vendor.integrationsSupported,
      hasDPA: vendor.hasDPA,
      gdprCompliant: vendor.gdprCompliant,
      soc2Certified: vendor.soc2Certified,
      iso27001Certified: vendor.iso27001Certified,
      companySize: vendor.companySize,
      foundedYear: vendor.foundedYear,
      headquarters: vendor.headquarters,
      employeeCount: vendor.employeeCount,
      keyFeatures: vendor.keyFeatures,
      prosConsList: vendor.prosConsList,
      overallScore: vendor.overallScore,
      easeOfUse: vendor.easeOfUse,
      featureRichness: vendor.featureRichness,
      valueForMoney: vendor.valueForMoney,
      customerSupport: vendor.customerSupport,
    });

    // 4. Call DeepSeek Reasoner for deep analysis
    const deepseekResult = await callDeepSeek({
      systemPrompt: VENDOR_ASSESSMENT_SYSTEM_PROMPT,
      userPrompt,
      model: "deepseek-reasoner",
      maxTokens: 8000,
      jsonMode: false, // Reasoner doesn't support json_mode
      enableFallback: true,
    });

    // 5. Parse the JSON response
    const parsed = parseJsonResponse<DeepSeekAssessmentResponse>(
      deepseekResult.content,
    );

    // Validate and clamp scores to 0-100
    const clamp = (val: unknown, fallback: number = 50): number => {
      const n = typeof val === "number" ? val : Number(val);
      if (isNaN(n)) return fallback;
      return Math.max(0, Math.min(100, Math.round(n)));
    };

    const overallScore = clamp(parsed.overallScore);
    const securityScore = clamp(parsed.securityScore);
    const privacyScore = clamp(parsed.privacyScore);
    const complianceScore = clamp(parsed.complianceScore);
    const financialScore = clamp(parsed.financialScore);
    const productFitScore = clamp(parsed.productFitScore);

    // 6. Update the assessment record with results
    await db.vendorAssessment.update({
      where: { id: assessment.id },
      data: {
        status: "COMPLETED",
        overallScore,
        securityScore,
        privacyScore,
        complianceScore,
        financialScore,
        dimensions: parsed.dimensions as object,
        findings: parsed.findings || "",
        recommendation: parsed.recommendation || "",
        rawData: {
          reasoningContent: deepseekResult.reasoningContent || null,
          modelUsed: deepseekResult.modelUsed,
          inputTokens: deepseekResult.inputTokens,
          outputTokens: deepseekResult.outputTokens,
          reasoningTokens: deepseekResult.reasoningTokens,
        },
        tokensUsed: deepseekResult.totalTokens,
        costUsd: deepseekResult.costUsd,
      },
    });

    // 7. Update the vendor's overallScore with the assessment score (normalized to 0-10 scale)
    const normalizedScore = Math.round((overallScore / 10) * 10) / 10; // Convert 0-100 to 0-10 with one decimal
    await db.vendor.update({
      where: { id: vendor.id },
      data: {
        overallScore: normalizedScore,
        lastVerifiedAt: new Date(),
      },
    });

    // 8. Return the result
    const result: VendorAssessmentResult = {
      assessmentId: assessment.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      overallScore,
      securityScore,
      privacyScore,
      complianceScore,
      financialScore,
      productFitScore,
      dimensions: parsed.dimensions,
      findings: parsed.findings || "",
      recommendation: parsed.recommendation || "",
    };

    return {
      success: true,
      data: result,
      tokensUsed: deepseekResult.totalTokens,
      costUsd: deepseekResult.costUsd,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Update assessment to failed status
    await db.vendorAssessment.update({
      where: { id: assessment.id },
      data: {
        status: "FAILED",
        rawData: { error: errorMessage },
      },
    });

    console.error(
      `[VendorAssessment] Failed for vendor ${vendor.name} (${vendorId}):`,
      errorMessage,
    );

    return {
      success: false,
      error: `Assessment failed for ${vendor.name}: ${errorMessage}`,
      tokensUsed: 0,
      costUsd: 0,
    };
  }
}
