// EU AI Act Risk Classification Data
// Based on the EU AI Act (Regulation (EU) 2024/1689)

export const AI_ACT_ROLES = [
  {
    id: "provider",
    label: "Provider",
    description:
      "You develop or have an AI system developed and place it on the market or put it into service under your own name or trademark",
  },
  {
    id: "deployer",
    label: "Deployer",
    description:
      "You use an AI system under your authority, except where the AI system is used in the course of a personal non-professional activity",
  },
  {
    id: "importer",
    label: "Importer",
    description:
      "You place on the EU market an AI system that bears the name or trademark of a non-EU provider",
  },
  {
    id: "distributor",
    label: "Distributor",
    description:
      "You make an AI system available on the EU market without modifying it",
  },
] as const;

export const AI_SYSTEM_TYPES = [
  {
    id: "biometric_identification",
    label: "Biometric Identification & Categorisation",
    description: "Real-time or post remote biometric identification systems",
    riskLevel: "unacceptable_or_high",
    examples: [
      "Facial recognition for law enforcement",
      "Emotion recognition in workplace",
      "Biometric categorisation by sensitive attributes",
    ],
  },
  {
    id: "critical_infrastructure",
    label: "Critical Infrastructure Management",
    description: "AI systems used as safety components in critical infrastructure",
    riskLevel: "high",
    examples: [
      "Road traffic management",
      "Water/gas/electricity supply",
      "Digital infrastructure management",
    ],
  },
  {
    id: "education_training",
    label: "Education & Vocational Training",
    description: "AI systems used in education for assessment or access decisions",
    riskLevel: "high",
    examples: [
      "Student scoring/assessment",
      "Admission decisions",
      "Proctoring systems",
      "Learning behaviour monitoring",
    ],
  },
  {
    id: "employment_hr",
    label: "Employment & Worker Management",
    description: "AI systems for recruitment, HR decisions, and worker management",
    riskLevel: "high",
    examples: [
      "CV screening/filtering",
      "Job advertisement targeting",
      "Performance evaluation",
      "Promotion/termination decisions",
      "Task allocation based on behaviour",
    ],
  },
  {
    id: "essential_services",
    label: "Access to Essential Services",
    description: "AI for creditworthiness, insurance, public benefits, emergency services",
    riskLevel: "high",
    examples: [
      "Credit scoring",
      "Insurance risk assessment",
      "Public benefit eligibility",
      "Emergency services dispatch/priority",
    ],
  },
  {
    id: "law_enforcement",
    label: "Law Enforcement",
    description: "AI systems used by law enforcement authorities",
    riskLevel: "high",
    examples: [
      "Risk assessment of individuals",
      "Polygraph/lie detection",
      "Evidence analysis",
      "Crime prediction (profiling)",
    ],
  },
  {
    id: "migration_asylum",
    label: "Migration, Asylum & Border Control",
    description: "AI in migration and border management",
    riskLevel: "high",
    examples: [
      "Travel document authenticity",
      "Asylum application assessment",
      "Risk assessment at borders",
    ],
  },
  {
    id: "justice_democracy",
    label: "Administration of Justice & Democracy",
    description: "AI in judicial proceedings and democratic processes",
    riskLevel: "high",
    examples: [
      "Judicial decision support",
      "Dispute resolution assistance",
      "Election/voting influence",
    ],
  },
  {
    id: "general_purpose",
    label: "General-Purpose AI (GPAI)",
    description: "Foundation models and general-purpose AI systems",
    riskLevel: "gpai",
    examples: [
      "Large language models (GPT, Claude, etc.)",
      "Image generation models",
      "Multi-modal AI systems",
      "Code generation systems",
    ],
  },
  {
    id: "chatbot_interaction",
    label: "Chatbots & Human Interaction Systems",
    description: "AI systems that interact directly with humans",
    riskLevel: "limited",
    examples: [
      "Customer service chatbots",
      "Virtual assistants",
      "AI-generated content (text, image, audio, video)",
    ],
  },
  {
    id: "content_generation",
    label: "Content Generation & Deepfakes",
    description: "AI systems generating synthetic content",
    riskLevel: "limited",
    examples: [
      "Text generation",
      "Image/video synthesis",
      "Voice cloning",
      "Deepfake creation",
    ],
  },
  {
    id: "recommendation_systems",
    label: "Recommendation & Personalization",
    description: "AI-powered recommendation engines and personalization",
    riskLevel: "minimal",
    examples: [
      "Product recommendations",
      "Content personalization",
      "Search ranking",
      "Advertising targeting",
    ],
  },
  {
    id: "spam_filter",
    label: "Spam Filters & Basic Automation",
    description: "Low-risk AI applications with minimal impact",
    riskLevel: "minimal",
    examples: [
      "Email spam filters",
      "Inventory management",
      "AI-enabled video games",
      "Industrial process optimization",
    ],
  },
] as const;

export const RISK_LEVELS = {
  unacceptable: {
    id: "unacceptable",
    label: "Unacceptable Risk",
    color: "red",
    description: "Prohibited AI practices under the EU AI Act",
    summary:
      "These AI systems are BANNED in the EU. They cannot be placed on the market, put into service, or used.",
  },
  high: {
    id: "high",
    label: "High Risk",
    color: "orange",
    description: "Subject to strict requirements before market placement",
    summary:
      "Must comply with comprehensive requirements including risk management, data governance, documentation, transparency, human oversight, and accuracy/robustness.",
  },
  gpai: {
    id: "gpai",
    label: "General-Purpose AI",
    color: "yellow",
    description: "Subject to GPAI-specific transparency and documentation requirements",
    summary:
      "Must comply with transparency obligations. Systemic risk GPAI models face additional requirements.",
  },
  limited: {
    id: "limited",
    label: "Limited Risk",
    color: "blue",
    description: "Subject to transparency obligations",
    summary:
      "Must inform users they are interacting with AI. Synthetic content must be labelled.",
  },
  minimal: {
    id: "minimal",
    label: "Minimal Risk",
    color: "green",
    description: "No specific obligations, voluntary codes of conduct encouraged",
    summary:
      "Free to develop and deploy. Voluntary adherence to codes of conduct is encouraged.",
  },
} as const;

export const GEOGRAPHIES = [
  { id: "eu", label: "European Union (any member state)" },
  { id: "eea", label: "European Economic Area (EEA)" },
  { id: "uk", label: "United Kingdom" },
  { id: "us", label: "United States" },
  { id: "global", label: "Global / Multiple Regions" },
  { id: "other", label: "Other" },
] as const;

export const USE_CASE_CATEGORIES = [
  "Healthcare & Medical Devices",
  "Financial Services & Insurance",
  "Human Resources & Recruitment",
  "Education & Training",
  "Public Sector & Government",
  "Law Enforcement & Security",
  "Manufacturing & Industry",
  "Retail & E-commerce",
  "Transportation & Logistics",
  "Legal & Professional Services",
  "Marketing & Advertising",
  "Customer Service & Support",
  "Research & Development",
  "Other",
] as const;

export const AI_ACT_TIMELINE = [
  {
    date: "2024-08-01",
    title: "AI Act enters into force",
    description: "Regulation (EU) 2024/1689 published and enters into force",
    status: "completed",
  },
  {
    date: "2025-02-02",
    title: "Prohibited practices apply",
    description:
      "Ban on unacceptable risk AI systems takes effect (social scoring, manipulative AI, untargeted facial recognition databases, emotion inference in workplaces/education)",
    status: "completed",
  },
  {
    date: "2025-08-02",
    title: "GPAI model rules apply",
    description:
      "Obligations for general-purpose AI models take effect. AI literacy requirements start. Governance structures (AI Office, Board, Forum) become operational.",
    status: "active",
  },
  {
    date: "2026-08-02",
    title: "Full application for high-risk AI",
    description:
      "All high-risk AI system requirements apply. Penalties for non-compliance enforceable. New high-risk systems in Annex III must fully comply.",
    status: "upcoming",
  },
  {
    date: "2027-08-02",
    title: "Extended deadline for certain high-risk systems",
    description:
      "High-risk AI systems that are safety components of products covered by existing EU harmonisation legislation (Annex I) must comply.",
    status: "future",
  },
] as const;

export const HIGH_RISK_OBLIGATIONS = {
  provider: [
    {
      id: "risk_management",
      title: "Risk Management System",
      article: "Article 9",
      description:
        "Establish, implement, document, and maintain a risk management system throughout the entire lifecycle of the high-risk AI system",
      requirements: [
        "Identify and analyse known and foreseeable risks",
        "Estimate and evaluate risks from intended use and reasonably foreseeable misuse",
        "Adopt risk management measures",
        "Test the system to identify appropriate measures",
      ],
    },
    {
      id: "data_governance",
      title: "Data & Data Governance",
      article: "Article 10",
      description:
        "Training, validation, and testing data sets shall be subject to appropriate data governance and management practices",
      requirements: [
        "Design choices for data collection",
        "Data preparation processing (annotation, labelling, cleaning, enrichment)",
        "Formulation of assumptions about data representation",
        "Assessment of data availability, quantity, and suitability",
        "Examination for possible biases",
        "Identification of data gaps or shortcomings",
      ],
    },
    {
      id: "technical_documentation",
      title: "Technical Documentation",
      article: "Article 11",
      description:
        "Draw up technical documentation before the system is placed on the market or put into service, kept up to date",
      requirements: [
        "General description of the AI system",
        "Detailed description of elements and development process",
        "Information about monitoring, functioning, and control",
        "Detailed description of risk management system",
        "Description of changes throughout lifecycle",
        "List of applied harmonised standards",
        "Copy of the EU declaration of conformity",
      ],
    },
    {
      id: "record_keeping",
      title: "Record-Keeping / Logging",
      article: "Article 12",
      description:
        "Automatic recording of events (logs) throughout the lifetime of the system",
      requirements: [
        "Enable traceability of system functioning",
        "Logging of start/stop periods",
        "Reference database used for input data checks",
        "Input data for which a match has been found",
        "Human verification and identification of results",
      ],
    },
    {
      id: "transparency",
      title: "Transparency & Information to Deployers",
      article: "Article 13",
      description:
        "Ensure sufficient transparency for deployers to interpret and use the system appropriately",
      requirements: [
        "Clear instructions of use",
        "Concise and complete information about the system",
        "Characteristics, capabilities, and limitations",
        "Performance metrics for intended purpose",
        "Known or foreseeable circumstances of misuse",
        "Technical measures for human oversight",
        "Computational and hardware resources needed",
      ],
    },
    {
      id: "human_oversight",
      title: "Human Oversight",
      article: "Article 14",
      description:
        "Design the system to allow effective human oversight during use",
      requirements: [
        "Enable human understanding of system capabilities/limitations",
        "Allow awareness of automation bias risk",
        "Enable correct interpretation of outputs",
        "Enable decision to not use or override the system",
        "Enable interruption through a stop button or similar",
      ],
    },
    {
      id: "accuracy_robustness",
      title: "Accuracy, Robustness & Cybersecurity",
      article: "Article 15",
      description:
        "Achieve appropriate levels of accuracy, robustness, and cybersecurity",
      requirements: [
        "Declare and measure levels of accuracy",
        "Resilience against errors, faults, or inconsistencies",
        "Technical redundancy including backup/fail-safe plans",
        "Resilience against unauthorized third-party manipulation",
        "Address AI-specific vulnerabilities (data poisoning, adversarial examples)",
      ],
    },
    {
      id: "quality_management",
      title: "Quality Management System",
      article: "Article 17",
      description:
        "Put a quality management system in place ensuring compliance",
      requirements: [
        "Regulatory compliance strategy",
        "Design and development process documentation",
        "System testing and validation procedures",
        "Technical specifications and standards applied",
        "Data management systems and procedures",
        "Post-market monitoring plan",
        "Communication procedures with competent authorities",
      ],
    },
    {
      id: "conformity_assessment",
      title: "Conformity Assessment",
      article: "Article 43",
      description:
        "Undergo conformity assessment prior to placing on the market",
      requirements: [
        "Internal control (Annex VI) or third-party assessment (Annex VII)",
        "EU declaration of conformity",
        "CE marking affixed",
        "Registration in the EU database",
      ],
    },
    {
      id: "post_market_monitoring",
      title: "Post-Market Monitoring",
      article: "Article 72",
      description:
        "Establish and document a post-market monitoring system proportionate to the nature and risks",
      requirements: [
        "Actively and systematically collect data on performance",
        "Evaluate continuous compliance with requirements",
        "Assess need for corrective or preventive actions",
        "Document and update the monitoring plan",
      ],
    },
    {
      id: "serious_incident_reporting",
      title: "Serious Incident Reporting",
      article: "Article 73",
      description:
        "Report any serious incident to market surveillance authorities",
      requirements: [
        "Report within 15 days of becoming aware of the incident",
        "Report immediately for widespread infringement or death",
        "Investigate the incident and cooperate with authorities",
      ],
    },
  ],
  deployer: [
    {
      id: "deployer_use_instructions",
      title: "Use in Accordance with Instructions",
      article: "Article 26(1)",
      description:
        "Use the high-risk AI system in accordance with the instructions of use accompanying the system",
      requirements: [
        "Follow provider's instructions of use",
        "Ensure input data is relevant and representative",
        "Monitor operation as per instructions",
      ],
    },
    {
      id: "deployer_human_oversight",
      title: "Assign Human Oversight",
      article: "Article 26(2)",
      description:
        "Assign human oversight to natural persons with necessary competence, training, and authority",
      requirements: [
        "Designate qualified individuals for oversight",
        "Ensure overseers understand system capabilities/limitations",
        "Empower overseers to not use or override the system",
      ],
    },
    {
      id: "deployer_monitoring",
      title: "Monitor Operation",
      article: "Article 26(5)",
      description:
        "Monitor the operation of the system and inform the provider of any risks or incidents",
      requirements: [
        "Monitor the system on an ongoing basis",
        "Report serious incidents to provider and authorities",
        "Suspend use if risk to health/safety/rights",
      ],
    },
    {
      id: "deployer_logs",
      title: "Keep Logs",
      article: "Article 26(6)",
      description:
        "Keep the logs automatically generated by the high-risk AI system for at least 6 months",
      requirements: [
        "Retain automatically generated logs",
        "Minimum retention period: 6 months",
        "Make logs available to authorities upon request",
      ],
    },
    {
      id: "deployer_dpia",
      title: "Data Protection Impact Assessment (DPIA)",
      article: "Article 26(9)",
      description:
        "Use information from the provider to carry out a DPIA where required under GDPR",
      requirements: [
        "Conduct DPIA using provider's documentation",
        "Consider the specific context of deployment",
        "Document the assessment and outcomes",
      ],
    },
    {
      id: "deployer_fria",
      title: "Fundamental Rights Impact Assessment (FRIA)",
      article: "Article 27",
      description:
        "Perform an assessment of the impact on fundamental rights before deploying certain high-risk AI systems",
      requirements: [
        "Describe deployer's processes using the AI system",
        "Describe the period and frequency of use",
        "Categories of persons and groups affected",
        "Specific risks of harm to affected persons",
        "Human oversight measures",
        "Measures if risks materialize",
        "Notify the market surveillance authority",
      ],
    },
  ],
} as const;

export const GPAI_OBLIGATIONS = [
  {
    id: "gpai_technical_doc",
    title: "Technical Documentation",
    article: "Article 53(1)(a)",
    description: "Draw up and keep technical documentation of the model",
    forSystemicRisk: false,
  },
  {
    id: "gpai_info_downstream",
    title: "Information for Downstream Providers",
    article: "Article 53(1)(b)",
    description:
      "Provide information and documentation to downstream providers integrating the GPAI model",
    forSystemicRisk: false,
  },
  {
    id: "gpai_copyright_policy",
    title: "Copyright Compliance Policy",
    article: "Article 53(1)(c)",
    description:
      "Put in place a policy to comply with EU copyright law (including text and data mining opt-outs)",
    forSystemicRisk: false,
  },
  {
    id: "gpai_training_summary",
    title: "Training Content Summary",
    article: "Article 53(1)(d)",
    description:
      "Make publicly available a sufficiently detailed summary about the training data used",
    forSystemicRisk: false,
  },
  {
    id: "gpai_model_evaluation",
    title: "Model Evaluation",
    article: "Article 55(1)(a)",
    description:
      "Perform model evaluation including adversarial testing to identify and mitigate systemic risk",
    forSystemicRisk: true,
  },
  {
    id: "gpai_risk_mitigation",
    title: "Systemic Risk Mitigation",
    article: "Article 55(1)(b)",
    description:
      "Assess and mitigate possible systemic risks at Union level",
    forSystemicRisk: true,
  },
  {
    id: "gpai_incident_tracking",
    title: "Incident Tracking & Reporting",
    article: "Article 55(1)(c)",
    description:
      "Track, document, and report serious incidents and possible corrective measures to the AI Office",
    forSystemicRisk: true,
  },
  {
    id: "gpai_cybersecurity",
    title: "Adequate Cybersecurity Protection",
    article: "Article 55(1)(d)",
    description:
      "Ensure an adequate level of cybersecurity protection for the GPAI model with systemic risk",
    forSystemicRisk: true,
  },
] as const;

export const LIMITED_RISK_OBLIGATIONS = [
  {
    id: "transparency_ai_interaction",
    title: "Disclose AI Interaction",
    article: "Article 50(1)",
    description:
      "Inform persons that they are interacting with an AI system (unless obvious from context)",
  },
  {
    id: "transparency_synthetic_content",
    title: "Label Synthetic Content",
    article: "Article 50(2)",
    description:
      "Mark AI-generated content (text, audio, image, video) in a machine-readable format",
  },
  {
    id: "transparency_deepfakes",
    title: "Disclose Deepfakes",
    article: "Article 50(4)",
    description:
      "Disclose that content has been artificially generated or manipulated (deepfakes)",
  },
] as const;

export const PENALTIES = {
  prohibited_practices: {
    maxFine: "35 million EUR or 7% of global annual turnover",
    description: "For violations of prohibited AI practices (Article 5)",
  },
  high_risk_violations: {
    maxFine: "15 million EUR or 3% of global annual turnover",
    description: "For non-compliance with high-risk AI system requirements",
  },
  incorrect_information: {
    maxFine: "7.5 million EUR or 1.5% of global annual turnover",
    description: "For supplying incorrect, incomplete, or misleading information to authorities",
  },
  sme_reduction: {
    description:
      "For SMEs and startups, the lower of the two amounts (fixed or turnover %) applies",
  },
} as const;
