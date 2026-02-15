// Compliance framework mappings for cross-referencing

export const COMPLIANCE_FRAMEWORKS = {
  SOC2: {
    id: "soc2",
    name: "SOC 2",
    fullName: "Service Organization Control 2",
    categories: [
      "Security",
      "Availability",
      "Processing Integrity",
      "Confidentiality",
      "Privacy",
    ],
    aiRelevantControls: [
      {
        id: "CC1.1",
        category: "Control Environment",
        title: "COSO Principle 1",
        aiMapping: "AI governance structure and ethical principles",
      },
      {
        id: "CC3.1",
        category: "Risk Assessment",
        title: "Risk identification and assessment",
        aiMapping: "AI model risk assessment, bias testing, fairness evaluation",
      },
      {
        id: "CC5.1",
        category: "Control Activities",
        title: "Logical access controls",
        aiMapping: "AI model access controls, API authentication, role-based permissions",
      },
      {
        id: "CC6.1",
        category: "Logical and Physical Access",
        title: "Logical access security",
        aiMapping: "Model endpoint security, training data access controls",
      },
      {
        id: "CC7.1",
        category: "System Operations",
        title: "Detection of unauthorized changes",
        aiMapping: "Model drift monitoring, version control, tamper detection",
      },
      {
        id: "CC8.1",
        category: "Change Management",
        title: "Change management process",
        aiMapping: "AI model versioning, deployment pipelines, rollback procedures",
      },
      {
        id: "CC9.1",
        category: "Risk Mitigation",
        title: "Risk mitigation activities",
        aiMapping: "AI incident response, model degradation handling",
      },
      {
        id: "PI1.1",
        category: "Processing Integrity",
        title: "Processing integrity objectives",
        aiMapping: "AI output accuracy, validation, quality assurance",
      },
      {
        id: "P1.1",
        category: "Privacy",
        title: "Privacy notice",
        aiMapping: "AI data usage disclosure, automated decision-making transparency",
      },
    ],
  },
  ISO27001: {
    id: "iso27001",
    name: "ISO 27001",
    fullName: "ISO/IEC 27001:2022 Information Security Management",
    aiRelevantControls: [
      {
        id: "A.5.1",
        category: "Organizational",
        title: "Policies for information security",
        aiMapping: "AI-specific security policies and acceptable use",
      },
      {
        id: "A.5.8",
        category: "Organizational",
        title: "Information security in project management",
        aiMapping: "Security requirements in AI development projects",
      },
      {
        id: "A.6.3",
        category: "People",
        title: "Information security awareness and training",
        aiMapping: "AI literacy training as per EU AI Act Article 4",
      },
      {
        id: "A.8.1",
        category: "Technological",
        title: "User endpoint devices",
        aiMapping: "Secure AI development environments",
      },
      {
        id: "A.8.10",
        category: "Technological",
        title: "Information deletion",
        aiMapping: "AI training data deletion, model unlearning",
      },
      {
        id: "A.8.11",
        category: "Technological",
        title: "Data masking",
        aiMapping: "PII masking in AI training data, differential privacy",
      },
      {
        id: "A.8.23",
        category: "Technological",
        title: "Web filtering",
        aiMapping: "AI content filtering, output safety guardrails",
      },
      {
        id: "A.8.25",
        category: "Technological",
        title: "Secure development lifecycle",
        aiMapping: "Secure ML development lifecycle (MLSecOps)",
      },
      {
        id: "A.8.28",
        category: "Technological",
        title: "Secure coding",
        aiMapping: "Secure AI/ML coding practices, prompt injection prevention",
      },
    ],
  },
  HIPAA: {
    id: "hipaa",
    name: "HIPAA",
    fullName: "Health Insurance Portability and Accountability Act",
    aiRelevantControls: [
      {
        id: "164.312(a)(1)",
        category: "Technical Safeguards",
        title: "Access Control",
        aiMapping: "AI system access controls for PHI processing",
      },
      {
        id: "164.312(b)",
        category: "Technical Safeguards",
        title: "Audit Controls",
        aiMapping: "AI decision logging for PHI-related determinations",
      },
      {
        id: "164.312(c)(1)",
        category: "Technical Safeguards",
        title: "Integrity",
        aiMapping: "AI model integrity protection, training data integrity",
      },
      {
        id: "164.312(e)(1)",
        category: "Technical Safeguards",
        title: "Transmission Security",
        aiMapping: "Encrypted AI API communications for PHI",
      },
      {
        id: "164.308(a)(1)",
        category: "Administrative Safeguards",
        title: "Security Management Process",
        aiMapping: "AI-specific risk analysis for PHI processing",
      },
      {
        id: "164.308(a)(4)",
        category: "Administrative Safeguards",
        title: "Information Access Management",
        aiMapping: "Minimum necessary PHI access for AI training/inference",
      },
    ],
  },
  NIST_AI_RMF: {
    id: "nist_ai_rmf",
    name: "NIST AI RMF",
    fullName: "NIST AI Risk Management Framework 1.0",
    functions: [
      {
        id: "GOVERN",
        title: "Govern",
        description: "Cultivate and implement a culture of risk management",
        categories: [
          "Policies and procedures",
          "Accountability structures",
          "Workforce diversity and culture",
          "Organizational commitments",
        ],
      },
      {
        id: "MAP",
        title: "Map",
        description: "Establish context for framing AI risks",
        categories: [
          "Intended purposes and context of use",
          "Interdependencies and expected benefits",
          "AI actor categorization",
          "Risks and benefits mapping",
        ],
      },
      {
        id: "MEASURE",
        title: "Measure",
        description: "Analyze, assess, benchmark, and monitor AI risks",
        categories: [
          "Appropriate metrics and methods",
          "AI system evaluation",
          "Trustworthiness characteristics",
          "Third-party evaluation",
        ],
      },
      {
        id: "MANAGE",
        title: "Manage",
        description: "Allocate resources to mapped and measured risks",
        categories: [
          "Risk treatment plans",
          "Risk response actions",
          "Risk monitoring",
          "Pre-deployment testing and post-deployment monitoring",
        ],
      },
    ],
  },
} as const;
