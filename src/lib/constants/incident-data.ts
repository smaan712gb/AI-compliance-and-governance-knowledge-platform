// ============================================
// INCIDENT MATERIALITY ASSESSMENT CONSTANTS
// ============================================

export const INCIDENT_TYPES = [
  { value: "DATA_BREACH", label: "Data Breach", description: "Unauthorized access to or disclosure of personal/sensitive data" },
  { value: "RANSOMWARE", label: "Ransomware Attack", description: "Encryption of systems/data with ransom demand" },
  { value: "INSIDER_THREAT", label: "Insider Threat", description: "Malicious or negligent action by employee, contractor, or partner" },
  { value: "SUPPLY_CHAIN_COMPROMISE", label: "Supply Chain Compromise", description: "Attack via third-party vendor, software, or service" },
  { value: "DDOS", label: "DDoS Attack", description: "Distributed denial-of-service disrupting business operations" },
  { value: "PHISHING", label: "Phishing / Social Engineering", description: "Credential theft or fraud via social engineering" },
  { value: "SYSTEM_COMPROMISE", label: "System Compromise", description: "Unauthorized access to critical infrastructure or systems" },
  { value: "UNAUTHORIZED_ACCESS", label: "Unauthorized Access", description: "Access to systems/data beyond authorization scope" },
  { value: "DATA_LOSS", label: "Data Loss / Destruction", description: "Accidental or malicious destruction of data without backup" },
  { value: "BUSINESS_EMAIL_COMPROMISE", label: "Business Email Compromise", description: "Fraudulent email impersonation leading to financial or data loss" },
] as const;

export const DATA_TYPES_INVOLVED = [
  { value: "PII", label: "Personal Identifiable Information (PII)" },
  { value: "PHI", label: "Protected Health Information (PHI)" },
  { value: "FINANCIAL", label: "Financial Data (PCI, banking)" },
  { value: "CREDENTIALS", label: "Credentials & Authentication Data" },
  { value: "TRADE_SECRETS", label: "Trade Secrets / IP" },
  { value: "CLASSIFIED", label: "Government Classified / Controlled" },
] as const;

export const MATERIALITY_LEVELS = [
  { value: "MATERIAL", label: "Material", color: "red", description: "Requires SEC Form 8-K disclosure within 4 business days" },
  { value: "LIKELY_MATERIAL", label: "Likely Material", color: "orange", description: "Probable materiality — initiate 8-K preparation and board notification" },
  { value: "POSSIBLY_MATERIAL", label: "Possibly Material", color: "yellow", description: "Materiality uncertain — continue investigation, prepare contingent disclosure" },
  { value: "NOT_MATERIAL", label: "Not Material", color: "green", description: "Below materiality threshold — document analysis, monitor for escalation" },
  { value: "INSUFFICIENT_DATA", label: "Insufficient Data", color: "gray", description: "Cannot determine — gather more facts before assessment" },
] as const;

export const RECORDS_AFFECTED_RANGES = [
  { value: "1-100", label: "1–100 records" },
  { value: "101-1000", label: "101–1,000 records" },
  { value: "1001-10000", label: "1,001–10,000 records" },
  { value: "10001-100000", label: "10,001–100,000 records" },
  { value: "100001-1000000", label: "100,001–1,000,000 records" },
  { value: "1000000+", label: "Over 1,000,000 records" },
  { value: "unknown", label: "Unknown / Still investigating" },
] as const;

export type IncidentTypeValue = (typeof INCIDENT_TYPES)[number]["value"];
export type DataTypeValue = (typeof DATA_TYPES_INVOLVED)[number]["value"];
export type MaterialityLevelValue = (typeof MATERIALITY_LEVELS)[number]["value"];
