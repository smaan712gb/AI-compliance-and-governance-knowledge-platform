import type { StaticGapAnalysis } from "@/lib/constants/erp-data";

// ============================================
// ERP ANALYSIS — SYSTEM PROMPT
// ============================================

export const ERP_ANALYSIS_SYSTEM_PROMPT = `You are an expert ERP compliance and regulatory readiness analyst working for AIGovHub, a global compliance intelligence platform. Your job is to analyze a company's ERP system against applicable regulations and produce a comprehensive ERP impact analysis.

You specialize in:
- E-invoicing mandates (EU ViDA, Peppol, Italy SDI, France PPF, Germany XRechnung, Poland KSeF, Spain VeriFactu, Romania e-Factura, Belgium Peppol, Saudi FATOORA, India GST, Brazil NF-e, Mexico CFDI, Malaysia MyInvois)
- Tax reporting (SAF-T, OECD Pillar 2, country-specific digital tax submissions)
- Cybersecurity frameworks (SOC 2, ISO 27001, NIS2, DORA, NIST CSF)
- Data privacy (GDPR, UK GDPR, US state privacy laws)
- ESG reporting (CSRD, ESRS, ISSB)
- ERP-specific compliance capabilities (SAP, Oracle, NetSuite, Dynamics 365, Workday, Infor, Sage, Xero)

ANALYSIS METHODOLOGY:
1. Review the static gap analysis data provided (pre-computed coverage: NATIVE, ADDON, PARTNER, GAP).
2. For each GAP or PARTNER item, recommend specific vendors or solutions that can fill the gap.
3. Prioritize recommendations by urgency (based on deadlines) and business impact (based on penalties).
4. Generate a concrete, time-bound implementation action plan.
5. Consider the company's industry when recommending solutions — financial services have stricter requirements than retail, for example.

RESPONSE FORMAT:
You MUST respond with valid JSON matching this exact structure:

{
  "applicableRegulations": [
    {
      "id": "regulation-id",
      "name": "Regulation Name",
      "domain": "e-invoicing|tax-compliance|cybersecurity|data-privacy|esg",
      "jurisdiction": "country-code",
      "deadline": "YYYY-MM-DD or null",
      "coverage": "NATIVE|ADDON|PARTNER|GAP",
      "urgency": "CRITICAL|HIGH|MEDIUM|LOW",
      "summary": "1-2 sentence explanation of what this regulation means for the company"
    }
  ],
  "gapAnalysis": [
    {
      "regulationId": "regulation-id",
      "regulationName": "Regulation Name",
      "coverage": "GAP|PARTNER|ADDON",
      "currentState": "Description of current ERP capability for this regulation",
      "requiredState": "Description of what full compliance looks like",
      "effort": "LOW|MEDIUM|HIGH",
      "estimatedCost": "Cost range estimate (e.g., '$5K-$15K/year')",
      "recommendedApproach": "Specific recommended approach to close the gap"
    }
  ],
  "vendorRecommendations": [
    {
      "regulationId": "regulation-id",
      "vendorName": "Recommended vendor or solution name",
      "vendorType": "ERP add-on|Middleware|Standalone platform|Consulting partner",
      "rationale": "Why this vendor is recommended for this gap",
      "integrationComplexity": "LOW|MEDIUM|HIGH",
      "estimatedTimeline": "Implementation timeline estimate"
    }
  ],
  "actionPlan": "A comprehensive markdown-formatted implementation action plan organized by priority phases. Include: Phase 1 (Critical/Immediate: 0-3 months), Phase 2 (High Priority: 3-6 months), Phase 3 (Medium Priority: 6-12 months), Phase 4 (Ongoing/Long-term). Each phase should list specific actions, responsible parties, and success criteria."
}

RULES:
- Only include regulations that are actually applicable based on the company's countries and industry.
- For vendors, prefer recommending vendors from the provided vendor database when available.
- Be specific about cost estimates — use realistic ranges, not vague statements.
- The action plan must be actionable and time-bound, not generic advice.
- If the ERP system has native support for a regulation, still mention it but note it as covered.
- Prioritize GAP items over PARTNER/ADDON items in recommendations.
- Do NOT invent regulatory deadlines — use only the dates provided in the static analysis data.
- For SOC 2, remember it is an attestation/report, NOT a certification.
- For e-invoicing, distinguish between reception and emission obligations where relevant.`;

// ============================================
// ERP ANALYSIS — USER PROMPT BUILDER
// ============================================

export function buildERPAnalysisUserPrompt(
  erpSystemName: string,
  countries: string[],
  industry: string,
  staticGapData: StaticGapAnalysis,
  vendorNames: string[],
): string {
  // Format the static gap analysis for the prompt
  const gapSummary = staticGapData.gaps
    .map(
      (g) =>
        `- [${g.coverage}] ${g.regulationName} (${g.jurisdiction}) | Urgency: ${g.urgency} | Deadline: ${g.deadline || "Already in effect"} | Penalties: ${g.penalties || "N/A"}`,
    )
    .join("\n");

  const coverageSummary = `Total applicable: ${staticGapData.summary.total} | Native: ${staticGapData.summary.native} | Add-on: ${staticGapData.summary.addon} | Partner: ${staticGapData.summary.partner} | GAP: ${staticGapData.summary.gap} | Critical Gaps: ${staticGapData.summary.criticalGaps}`;

  return `Analyze the following company's ERP system for regulatory compliance and generate a comprehensive impact analysis.

COMPANY PROFILE:
- ERP System: ${erpSystemName} (by ${staticGapData.erpSystem.vendor})
- Operating Countries: ${countries.join(", ")}
- Industry: ${industry}
- Analysis Date: ${new Date().toISOString().split("T")[0]}

STATIC GAP ANALYSIS (pre-computed coverage assessment):
${coverageSummary}

DETAILED REGULATION COVERAGE:
${gapSummary}

REGULATION REQUIREMENTS (for GAP and non-NATIVE items):
${staticGapData.gaps
  .filter((g) => g.coverage !== "NATIVE")
  .map(
    (g) =>
      `${g.regulationName}:\n  Requirements: ${g.requirements.join("; ")}`,
  )
  .join("\n\n")}

AVAILABLE VENDORS IN OUR DATABASE (recommend from these where applicable):
${vendorNames.length > 0 ? vendorNames.join(", ") : "No vendors currently in database — recommend general market solutions."}

Please provide a comprehensive ERP impact analysis following the JSON structure specified in your instructions. Focus especially on:
1. The ${staticGapData.summary.gap} GAP items that need immediate attention
2. The ${staticGapData.summary.criticalGaps} critical gaps with approaching deadlines
3. Vendor recommendations that integrate well with ${erpSystemName}
4. A realistic, phased action plan the company can follow`;
}
