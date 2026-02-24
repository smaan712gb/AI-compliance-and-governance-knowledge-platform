// ============================================
// POLICY-TO-CONTROL MAPPING CONSTANTS
// ============================================

export const FRAMEWORKS = [
  {
    value: "NIST_CSF_2",
    label: "NIST CSF 2.0",
    description: "Cybersecurity Framework — Govern, Identify, Protect, Detect, Respond, Recover",
    controlPrefix: "GV/ID/PR/DE/RS/RC",
  },
  {
    value: "ISO_27001_2022",
    label: "ISO 27001:2022",
    description: "Information Security Management — Annex A controls (A.5–A.8)",
    controlPrefix: "A.5–A.8",
  },
  {
    value: "SOC_2",
    label: "SOC 2 Type II",
    description: "Trust Services Criteria — CC1 through CC9 + availability, PI, confidentiality",
    controlPrefix: "CC1–CC9",
  },
  {
    value: "PCI_DSS_4",
    label: "PCI DSS 4.0",
    description: "Payment Card Industry — 12 requirements for cardholder data protection",
    controlPrefix: "Req 1–12",
  },
  {
    value: "DORA",
    label: "DORA (EU)",
    description: "Digital Operational Resilience Act — ICT risk management for financial entities",
    controlPrefix: "Art 5–15",
  },
  {
    value: "NIS2",
    label: "NIS2 Directive (EU)",
    description: "Network and Information Security — cybersecurity obligations for essential/important entities",
    controlPrefix: "Art 21",
  },
  {
    value: "HIPAA",
    label: "HIPAA",
    description: "Health Insurance Portability — Privacy, Security, and Breach Notification Rules",
    controlPrefix: "§164.xxx",
  },
  {
    value: "EU_AI_ACT",
    label: "EU AI Act",
    description: "AI System regulation — risk-based requirements (Art 6–52)",
    controlPrefix: "Art 6–52",
  },
  {
    value: "GDPR",
    label: "GDPR",
    description: "General Data Protection Regulation — data protection by design (Art 5–49)",
    controlPrefix: "Art 5–49",
  },
] as const;

export const POLICY_DOMAINS = [
  { value: "ACCESS_CONTROL", label: "Access Control & Identity Management" },
  { value: "DATA_PROTECTION", label: "Data Protection & Encryption" },
  { value: "INCIDENT_RESPONSE", label: "Incident Response & Recovery" },
  { value: "RISK_MANAGEMENT", label: "Risk Management & Assessment" },
  { value: "GOVERNANCE", label: "Governance & Oversight" },
  { value: "ASSET_MANAGEMENT", label: "Asset Management & Inventory" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain & Third-Party Risk" },
  { value: "SECURITY_OPERATIONS", label: "Security Operations & Monitoring" },
] as const;

export const MATURITY_LEVELS = [
  { value: "INITIAL", label: "Initial (Ad Hoc)", score: 1, description: "Processes are unpredictable, poorly controlled, and reactive" },
  { value: "DEVELOPING", label: "Developing (Repeatable)", score: 2, description: "Processes are documented and starting to be managed" },
  { value: "DEFINED", label: "Defined (Standardized)", score: 3, description: "Processes are standardized across the organization" },
  { value: "MANAGED", label: "Managed (Measured)", score: 4, description: "Processes are measured and controlled with metrics" },
  { value: "OPTIMIZING", label: "Optimizing (Continuous Improvement)", score: 5, description: "Focus on continuous improvement through feedback and innovation" },
] as const;

export type FrameworkValue = (typeof FRAMEWORKS)[number]["value"];
export type PolicyDomainValue = (typeof POLICY_DOMAINS)[number]["value"];
export type MaturityLevelValue = (typeof MATURITY_LEVELS)[number]["value"];
