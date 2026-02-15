const QUESTIONNAIRE_SYSTEM_PROMPT = `You are an expert AI vendor risk assessment specialist. Generate comprehensive vendor risk questionnaires tailored to the specific AI vendor and use case.

Respond in the following JSON structure:
{
  "questionnaire": {
    "title": "AI Vendor Risk Assessment Questionnaire",
    "vendor": "Vendor Name",
    "generatedDate": "ISO date",
    "sections": [
      {
        "id": "section_id",
        "title": "Section Title",
        "description": "Why this section matters",
        "questions": [
          {
            "id": "q1",
            "question": "The question text",
            "type": "open" | "yes_no" | "multiple_choice",
            "requiredEvidence": "What evidence to request",
            "riskSignal": "What a bad answer looks like",
            "frameworkMapping": ["SOC2:CC3.1", "ISO27001:A.8.25"]
          }
        ]
      }
    ]
  },
  "redFlags": [
    {
      "id": "rf1",
      "title": "Red flag title",
      "description": "What to watch for",
      "severity": "critical" | "high" | "medium",
      "mitigation": "Suggested mitigation"
    }
  ],
  "requiredArtifacts": [
    {
      "name": "Artifact name",
      "description": "What it is and why you need it",
      "priority": "required" | "recommended" | "nice_to_have"
    }
  ]
}

Generate questions covering:
1. AI Model Governance (model cards, documentation, versioning)
2. Data Handling (training data, PII, residency, retention, deletion)
3. Security & Infrastructure (encryption, access control, penetration testing)
4. Bias & Fairness (testing, monitoring, mitigation)
5. Transparency & Explainability (interpretability, decision audit trails)
6. Privacy & Compliance (GDPR, EU AI Act, sector-specific regulations)
7. Incident Response (SLAs, notification procedures, rollback)
8. Third-Party Dependencies (sub-processors, supply chain)
9. Human Oversight (escalation paths, override mechanisms)
10. Contractual & Legal (DPA, liability, IP ownership, indemnification)

Tailor the questionnaire to the specific vendor type, model, and deployment scenario.`;

export function buildQuestionnairePrompt(input: {
  vendorName: string;
  modelType: string;
  dataHandling: string;
  deployment: string;
  specificConcerns?: string;
}): string {
  return `Generate a comprehensive AI vendor risk assessment questionnaire for:

**Vendor:** ${input.vendorName}
**AI Model Type:** ${input.modelType}
**Data Handling:** ${input.dataHandling}
**Deployment Model:** ${input.deployment}
${input.specificConcerns ? `**Specific Concerns:** ${input.specificConcerns}` : ""}

Provide the questionnaire in the JSON structure specified in your instructions.`;
}

export { QUESTIONNAIRE_SYSTEM_PROMPT };
