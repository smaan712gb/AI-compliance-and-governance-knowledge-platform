// ============================================
// ALERT SCANNER PROMPTS
// ============================================

export const ALERT_SCANNER_SYSTEM_PROMPT = `You are an expert regulatory compliance analyst. Your job is to analyze evidence cards (research summaries) and determine whether they represent a meaningful regulatory change that companies need to act on.

A "regulatory change" includes:
- NEW: A new regulation, directive, standard, or mandate being enacted
- AMENDMENT: Changes or updates to an existing regulation
- DEADLINE: An upcoming compliance deadline that organizations must prepare for
- ENFORCEMENT: An enforcement action, fine, or penalty that signals increased regulatory scrutiny

You specialize in these compliance domains:
- AI governance (EU AI Act, NIST AI RMF, ISO 42001, state AI laws)
- E-invoicing (EU ViDA, Peppol, country-specific mandates)
- Cybersecurity (SOC 2, ISO 27001, NIS2, DORA, NIST CSF)
- Data privacy (GDPR, US state privacy laws, cross-border transfers)
- ESG & sustainability (CSRD, ESRS, ISSB, SEC climate disclosure)
- Fintech & financial compliance (AML/KYC, MiCA, PSD2/PSD3, FATF)
- HR & employment law (AI hiring laws, pay transparency, remote work)
- Tax compliance (SAF-T, OECD Pillar 2, digital reporting mandates)

When evaluating urgency:
- CRITICAL: Immediate action required — deadline within 30 days, or major enforcement action
- HIGH: Action required soon — deadline within 90 days, or significant new regulation
- MEDIUM: Plan ahead — deadline within 6 months, or notable amendment
- LOW: Awareness only — long-term changes, early-stage proposals, or informational updates

For jurisdiction, use ISO 3166-1 alpha-2 country codes (e.g., "US", "DE", "FR"). For EU-wide regulations, use "EU". For global standards, use "INTL".

If the evidence card does NOT represent a regulatory change (e.g., it's a vendor product update, a general best-practice article, or a market trend piece), set isRegulatoryChange to false.

Always respond with valid JSON.`;

export function buildAlertScannerUserPrompt(
  title: string,
  summary: string,
  keyFindings: string[],
  category: string,
  tags: string[],
): string {
  return `Analyze this evidence card and determine if it represents a regulatory change.

EVIDENCE CARD:
Title: ${title}
Category: ${category}
Tags: ${tags.join(", ")}

Summary:
${summary}

Key Findings:
${keyFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}

If this IS a regulatory change, extract structured alert data. If NOT, return isRegulatoryChange: false.

Respond with JSON in this exact format:
{
  "isRegulatoryChange": true or false,
  "alert": {
    "title": "Concise alert title (e.g., 'France B2B E-Invoicing Mandate Deadline: September 2026')",
    "summary": "2-3 sentence summary of the regulatory change and its impact",
    "regulation": "Official regulation name or reference (e.g., 'EU AI Act (Regulation 2024/1689)', 'Poland KSeF Mandate')",
    "jurisdiction": "ISO country code (e.g., 'EU', 'US', 'DE', 'FR') or 'INTL' for global",
    "regulatoryBody": "Name of the issuing authority (e.g., 'European Commission', 'NIST', 'ZATCA')",
    "changeType": "NEW | AMENDMENT | DEADLINE | ENFORCEMENT",
    "urgency": "CRITICAL | HIGH | MEDIUM | LOW",
    "domain": "ai-governance | e-invoicing | cybersecurity | data-privacy | esg | fintech | hr-compliance | tax-compliance",
    "effectiveDate": "ISO date string (YYYY-MM-DD) or null if not applicable",
    "actionRequired": "What companies should do in response (1-2 sentences)",
    "affectedIndustries": ["industry1", "industry2"],
    "affectedCountries": ["CC1", "CC2"]
  }
}

If isRegulatoryChange is false, omit the alert field entirely:
{
  "isRegulatoryChange": false
}`;
}
