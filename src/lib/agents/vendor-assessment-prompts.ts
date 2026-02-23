// ============================================
// VENDOR ASSESSMENT PROMPTS
// ============================================

export const VENDOR_ASSESSMENT_SYSTEM_PROMPT = `You are an expert vendor due diligence analyst specializing in compliance technology. You perform comprehensive vendor risk assessments for organizations evaluating GRC, privacy, cybersecurity, AI governance, e-invoicing, ESG, fintech, and HR compliance tools.

Your assessment methodology is rigorous, data-driven, and aligned with enterprise procurement standards. You evaluate vendors across 5 key dimensions, each scored 0-100:

1. SECURITY POSTURE (0-100):
   - SOC 2 Type II attestation (NOT a "certification" - it's an attestation report)
   - ISO/IEC 27001:2022 certification
   - Security headers and HTTPS enforcement
   - Vulnerability disclosure program / bug bounty
   - Encryption at rest and in transit
   - Penetration testing cadence
   - Incident response plan maturity
   - Zero Trust architecture adoption

2. PRIVACY COMPLIANCE (0-100):
   - GDPR compliance posture
   - Data Processing Agreement (DPA) availability and quality
   - Privacy policy comprehensiveness and clarity
   - Data residency and sovereignty options
   - Sub-processor transparency
   - Data retention and deletion policies
   - Privacy by design implementation
   - Cross-border data transfer mechanisms (SCCs, adequacy decisions)

3. COMPLIANCE BREADTH (0-100):
   - Number and diversity of regulatory frameworks supported
   - Geographic regulatory coverage (EU, US, APAC, MENA, LATAM)
   - Framework update cadence (how quickly they adopt new regulations)
   - Depth of framework implementation (mapping, controls, evidence collection)
   - Industry-specific compliance support
   - Continuous monitoring vs point-in-time assessments
   - Audit trail and evidence management capabilities

4. FINANCIAL STABILITY (0-100):
   - Company age and years in market
   - Employee headcount and growth trajectory
   - Funding history and total capital raised
   - Revenue signals (customer count, enterprise logos)
   - Market position and competitive standing
   - Leadership team experience and credibility
   - Customer retention indicators
   - Risk of acquisition or shutdown

5. PRODUCT FIT (0-100):
   - Feature set completeness for target use cases
   - Integration ecosystem (APIs, native integrations, marketplace)
   - Pricing transparency and value for money
   - Ease of use and time to value
   - Customer support quality and SLA availability
   - Documentation and training resources
   - Customization and extensibility
   - Mobile and multi-platform support

SCORING GUIDELINES:
- 90-100: Industry-leading. Best-in-class in this dimension.
- 75-89: Strong. Exceeds baseline requirements with notable strengths.
- 60-74: Adequate. Meets standard requirements with some gaps.
- 40-59: Below average. Significant gaps that require mitigation.
- 20-39: Weak. Major deficiencies that pose risk.
- 0-19: Critical. Fundamental shortcomings; not recommended.

When data is unavailable for a dimension, estimate conservatively based on available signals (company size, market position, certifications listed). Clearly note in your findings when scores are based on limited data.

IMPORTANT RULES:
- SOC 2 is an ATTESTATION, not a certification. Never call it a certification.
- ISO 27001 IS a certifiable standard.
- Do not invent specific financial figures. Use qualitative assessments when exact data is unavailable.
- Base your assessment on the data provided. Do not hallucinate features or certifications the vendor does not have.
- Be constructively critical — a useful assessment identifies both strengths AND weaknesses.

You MUST respond with valid JSON in the exact format specified in the user prompt. Do not include any text outside the JSON object.`;

export interface VendorData {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  websiteUrl: string;
  category: string;
  subcategories: string[];
  pricingModel: string;
  pricingStartsAt?: string | null;
  pricingDetails?: string | null;
  hasFreeTrialOrTier: boolean;
  frameworksSupported: string[];
  deploymentsSupported: string[];
  integrationsSupported: string[];
  hasDPA: boolean;
  gdprCompliant: boolean;
  soc2Certified: boolean;
  iso27001Certified: boolean;
  companySize?: string | null;
  foundedYear?: number | null;
  headquarters?: string | null;
  employeeCount?: string | null;
  keyFeatures?: unknown;
  prosConsList?: unknown;
  overallScore?: number | null;
  easeOfUse?: number | null;
  featureRichness?: number | null;
  valueForMoney?: number | null;
  customerSupport?: number | null;
}

export function buildVendorAssessmentUserPrompt(vendor: VendorData): string {
  const certifications: string[] = [];
  if (vendor.soc2Certified) certifications.push("SOC 2");
  if (vendor.iso27001Certified) certifications.push("ISO 27001");
  if (vendor.gdprCompliant) certifications.push("GDPR Compliant");
  if (vendor.hasDPA) certifications.push("DPA Available");

  const keyFeatures =
    vendor.keyFeatures && typeof vendor.keyFeatures === "object"
      ? JSON.stringify(vendor.keyFeatures)
      : "Not provided";

  const prosConsList =
    vendor.prosConsList && typeof vendor.prosConsList === "object"
      ? JSON.stringify(vendor.prosConsList)
      : "Not provided";

  return `Perform a comprehensive vendor due diligence assessment for the following vendor. Analyze all available data and score each dimension 0-100.

VENDOR PROFILE:
- Name: ${vendor.name}
- Website: ${vendor.websiteUrl}
- Category: ${vendor.category}
- Subcategories: ${vendor.subcategories.length > 0 ? vendor.subcategories.join(", ") : "None specified"}
- Description: ${vendor.description}
${vendor.shortDescription ? `- Short Description: ${vendor.shortDescription}` : ""}

PRICING & AVAILABILITY:
- Pricing Model: ${vendor.pricingModel}
${vendor.pricingStartsAt ? `- Starting Price: ${vendor.pricingStartsAt}` : "- Starting Price: Not disclosed"}
${vendor.pricingDetails ? `- Pricing Details: ${vendor.pricingDetails}` : ""}
- Free Trial/Tier: ${vendor.hasFreeTrialOrTier ? "Yes" : "No"}

COMPLIANCE & SECURITY:
- Certifications: ${certifications.length > 0 ? certifications.join(", ") : "None listed"}
- Frameworks Supported: ${vendor.frameworksSupported.length > 0 ? vendor.frameworksSupported.join(", ") : "None listed"}
- Deployment Options: ${vendor.deploymentsSupported.length > 0 ? vendor.deploymentsSupported.join(", ") : "Not specified"}
- Integrations: ${vendor.integrationsSupported.length > 0 ? vendor.integrationsSupported.join(", ") : "Not specified"}

COMPANY INFO:
- Headquarters: ${vendor.headquarters || "Not disclosed"}
- Founded Year: ${vendor.foundedYear || "Not disclosed"}
- Company Size: ${vendor.companySize || "Not disclosed"}
- Employee Count: ${vendor.employeeCount || "Not disclosed"}

EXISTING RATINGS (if available):
- Overall Score: ${vendor.overallScore ?? "Not rated"}
- Ease of Use: ${vendor.easeOfUse ?? "Not rated"}
- Feature Richness: ${vendor.featureRichness ?? "Not rated"}
- Value for Money: ${vendor.valueForMoney ?? "Not rated"}
- Customer Support: ${vendor.customerSupport ?? "Not rated"}

KEY FEATURES:
${keyFeatures}

PROS & CONS:
${prosConsList}

Respond with JSON in this exact format:
{
  "overallScore": <0-100 weighted average>,
  "securityScore": <0-100>,
  "privacyScore": <0-100>,
  "complianceScore": <0-100>,
  "financialScore": <0-100>,
  "productFitScore": <0-100>,
  "dimensions": {
    "security": {
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "dataConfidence": "high|medium|low",
      "notes": "Brief assessment notes"
    },
    "privacy": {
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "dataConfidence": "high|medium|low",
      "notes": "Brief assessment notes"
    },
    "compliance": {
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "dataConfidence": "high|medium|low",
      "notes": "Brief assessment notes"
    },
    "financial": {
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "dataConfidence": "high|medium|low",
      "notes": "Brief assessment notes"
    },
    "productFit": {
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "dataConfidence": "high|medium|low",
      "notes": "Brief assessment notes"
    }
  },
  "findings": "Detailed markdown findings report (500-800 words). Include: Executive Summary, Key Strengths, Areas of Concern, Risk Factors, and Data Gaps.",
  "recommendation": "Concise markdown recommendation (200-400 words). Include: Overall verdict, recommended use cases, caveats, and suggested due diligence follow-ups."
}`;
}
