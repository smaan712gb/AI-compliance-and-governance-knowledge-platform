// ================================================
// PCI DSS COMPLIANCE CHECKER CONSTANTS
// ================================================

export const PCI_COMPLIANCE_DOMAINS = [
  {
    value: "NETWORK_SECURITY",
    label: "Network Security (Requirements 1-2)",
    description: "Firewall configuration, network segmentation, secure configurations, and CDE boundary protection",
  },
  {
    value: "DATA_PROTECTION",
    label: "Data Protection (Requirements 3-4)",
    description: "Cardholder data storage, encryption, tokenization, masking, and key management",
  },
  {
    value: "VULNERABILITY_MGMT",
    label: "Vulnerability Management (Requirements 5-6)",
    description: "Anti-malware, secure development, patch management, and application security",
  },
  {
    value: "ACCESS_CONTROL",
    label: "Access Control (Requirements 7-9)",
    description: "Need-to-know access, MFA, physical access controls, and unique user IDs",
  },
  {
    value: "MONITORING_TESTING",
    label: "Monitoring & Testing (Requirements 10-11)",
    description: "Logging, monitoring, IDS/IPS, penetration testing, and file integrity monitoring",
  },
  {
    value: "SECURITY_POLICIES",
    label: "Security Policies (Requirement 12)",
    description: "Information security policy, risk assessment, awareness training, and incident response",
  },
] as const;

export const PCI_JURISDICTIONS = [
  // Global
  { value: "PCI_SSC_GLOBAL", label: "PCI SSC (Global Standard)", region: "global" },
  // Card Brands
  { value: "VISA", label: "Visa Program", region: "card_brand" },
  { value: "MASTERCARD", label: "Mastercard Program", region: "card_brand" },
  { value: "AMEX", label: "American Express", region: "card_brand" },
  { value: "DISCOVER", label: "Discover", region: "card_brand" },
  { value: "JCB", label: "JCB", region: "card_brand" },
  // Regional
  { value: "US_STATE_BREACH", label: "US State Breach Laws", region: "regional" },
  { value: "EU_PSD2", label: "EU PSD2 (Strong Customer Auth)", region: "regional" },
  { value: "UK_PSR", label: "UK Payment Services Regulations", region: "regional" },
  { value: "AU_APRA", label: "Australia (APRA CPS 234)", region: "regional" },
  { value: "SG_MAS_TRM", label: "Singapore (MAS TRM Guidelines)", region: "regional" },
  { value: "IN_RBI", label: "India (RBI Data Localization)", region: "regional" },
] as const;

export const SAQ_TYPES = [
  { value: "SAQ_A", label: "SAQ A — Card-not-present, fully outsourced" },
  { value: "SAQ_A_EP", label: "SAQ A-EP — E-commerce, partial outsourcing" },
  { value: "SAQ_B", label: "SAQ B — Imprint or dial-out terminals" },
  { value: "SAQ_B_IP", label: "SAQ B-IP — Standalone IP-connected PTS terminals" },
  { value: "SAQ_C", label: "SAQ C — Payment application systems" },
  { value: "SAQ_C_VT", label: "SAQ C-VT — Virtual terminal merchants" },
  { value: "SAQ_D_MERCHANT", label: "SAQ D (Merchant) — All other merchants" },
  { value: "SAQ_D_SP", label: "SAQ D (Service Provider) — Service providers" },
  { value: "ROC", label: "ROC — Report on Compliance (Level 1)" },
  { value: "UNSURE", label: "Not sure / need help determining" },
] as const;

export const MERCHANT_LEVELS = [
  { value: "LEVEL_1", label: "Level 1 — Over 6M transactions/year" },
  { value: "LEVEL_2", label: "Level 2 — 1M to 6M transactions/year" },
  { value: "LEVEL_3", label: "Level 3 — 20K to 1M e-commerce transactions/year" },
  { value: "LEVEL_4", label: "Level 4 — Under 20K e-commerce or under 1M other" },
  { value: "SP_LEVEL_1", label: "Service Provider Level 1 — Over 300K transactions/year" },
  { value: "SP_LEVEL_2", label: "Service Provider Level 2 — Under 300K transactions/year" },
  { value: "UNSURE", label: "Not sure" },
] as const;

export const PCI_SYSTEMS_USED = [
  { value: "POS_TERMINAL", label: "POS Terminals / Point of Sale" },
  { value: "PAYMENT_GATEWAY", label: "Payment Gateway (e.g., Stripe, Adyen, Braintree)" },
  { value: "ECOMMERCE_PLATFORM", label: "E-commerce Platform (e.g., Shopify, Magento)" },
  { value: "TOKENIZATION", label: "Tokenization Service" },
  { value: "WAF", label: "Web Application Firewall (WAF)" },
  { value: "SIEM", label: "SIEM / Log Management" },
  { value: "VULNERABILITY_SCANNER", label: "Vulnerability Scanner (ASV)" },
  { value: "ENCRYPTION_HSM", label: "Encryption / HSM" },
  { value: "IDS_IPS", label: "IDS/IPS" },
  { value: "NONE", label: "No dedicated security tools" },
] as const;

export const PCI_COMPLIANCE_CONCERNS = [
  { value: "V4_TRANSITION", label: "PCI DSS v4.0.1 transition (new requirements)" },
  { value: "SCRIPT_MONITORING", label: "Payment page script monitoring (Req 6.4.3)" },
  { value: "MFA_REQUIREMENTS", label: "MFA for all CDE access (Req 8.4.2)" },
  { value: "TARGETED_RISK_ANALYSIS", label: "Targeted risk analysis documentation (Req 12.3.1)" },
  { value: "ASV_SCANNING", label: "ASV scanning and penetration testing" },
  { value: "ENCRYPTION_TRANSIT", label: "Strong cryptography for data in transit" },
  { value: "KEY_MANAGEMENT", label: "Cryptographic key management" },
  { value: "THIRD_PARTY_MGMT", label: "Third-party service provider management (Req 12.8)" },
  { value: "SEGMENTATION_TESTING", label: "Network segmentation testing" },
  { value: "INCIDENT_RESPONSE", label: "Incident response plan testing" },
] as const;

export type PCIComplianceDomain = (typeof PCI_COMPLIANCE_DOMAINS)[number]["value"];
export type PCIJurisdiction = (typeof PCI_JURISDICTIONS)[number]["value"];
