// ============================================
// PRIVACY OPERATIONS TOOLKIT CONSTANTS
// ============================================

// ---------- DSAR Types ----------

export const DSAR_TYPES = [
  { value: "ACCESS", label: "Right of Access (Art. 15)", description: "Data subject requests copy of their personal data", deadline: 30 },
  { value: "RECTIFICATION", label: "Right to Rectification (Art. 16)", description: "Correct inaccurate personal data", deadline: 30 },
  { value: "ERASURE", label: "Right to Erasure (Art. 17)", description: "Delete personal data ('right to be forgotten')", deadline: 30 },
  { value: "RESTRICTION", label: "Right to Restriction (Art. 18)", description: "Restrict processing of personal data", deadline: 30 },
  { value: "PORTABILITY", label: "Right to Data Portability (Art. 20)", description: "Receive data in machine-readable format", deadline: 30 },
  { value: "OBJECTION", label: "Right to Object (Art. 21)", description: "Object to processing based on legitimate interests", deadline: 30 },
] as const;

export const DATA_SUBJECT_TYPES = [
  { value: "customer", label: "Customer / Client" },
  { value: "employee", label: "Employee / Staff" },
  { value: "prospect", label: "Prospect / Lead" },
  { value: "contractor", label: "Contractor / Freelancer" },
  { value: "website_visitor", label: "Website Visitor" },
  { value: "patient", label: "Patient" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
] as const;

// ---------- Legal Bases ----------

export const LEGAL_BASES = [
  { value: "CONSENT", label: "Consent (Art. 6(1)(a))", description: "Data subject has given consent for specific purposes" },
  { value: "CONTRACT", label: "Contract (Art. 6(1)(b))", description: "Processing necessary for performance of a contract" },
  { value: "LEGAL_OBLIGATION", label: "Legal Obligation (Art. 6(1)(c))", description: "Processing necessary for compliance with a legal obligation" },
  { value: "VITAL_INTERESTS", label: "Vital Interests (Art. 6(1)(d))", description: "Necessary to protect vital interests of the data subject" },
  { value: "PUBLIC_TASK", label: "Public Task (Art. 6(1)(e))", description: "Necessary for a task carried out in the public interest" },
  { value: "LEGITIMATE_INTERESTS", label: "Legitimate Interests (Art. 6(1)(f))", description: "Necessary for legitimate interests (requires balancing test)" },
] as const;

// ---------- Transfer Mechanisms ----------

export const TRANSFER_MECHANISMS = [
  { value: "adequacy_decision", label: "Adequacy Decision (Art. 45)" },
  { value: "sccs", label: "Standard Contractual Clauses (Art. 46(2)(c))" },
  { value: "bcrs", label: "Binding Corporate Rules (Art. 47)" },
  { value: "derogation", label: "Derogation (Art. 49) — Explicit Consent" },
  { value: "dpf", label: "EU-US Data Privacy Framework" },
  { value: "none", label: "No International Transfer" },
] as const;

// ---------- ROPA Data Categories ----------

export const DATA_CATEGORIES = [
  { value: "identity", label: "Identity Data (name, DOB, ID numbers)" },
  { value: "contact", label: "Contact Data (email, phone, address)" },
  { value: "financial", label: "Financial Data (bank, payment, credit)" },
  { value: "health", label: "Health / Medical Data" },
  { value: "employment", label: "Employment Data (salary, performance)" },
  { value: "behavioral", label: "Behavioral / Usage Data" },
  { value: "biometric", label: "Biometric Data" },
  { value: "location", label: "Location / Geolocation Data" },
  { value: "special_category", label: "Special Category Data (Art. 9)" },
] as const;

// ---------- DPA Key Clauses ----------

export const DPA_KEY_CLAUSES = [
  { value: "subject_matter", label: "Subject Matter & Duration" },
  { value: "instructions", label: "Processing Instructions" },
  { value: "confidentiality", label: "Confidentiality Obligations" },
  { value: "security_measures", label: "Security Measures (Art. 32)" },
  { value: "sub_processors", label: "Sub-Processor Management" },
  { value: "dsar_assistance", label: "DSAR Assistance" },
  { value: "breach_notification", label: "Breach Notification (72 hours)" },
  { value: "audit_rights", label: "Audit Rights" },
  { value: "data_deletion", label: "Data Deletion / Return" },
  { value: "international_transfers", label: "International Transfers" },
  { value: "liability_indemnity", label: "Liability & Indemnification" },
] as const;

export const JURISDICTIONS = [
  { value: "EU_GDPR", label: "EU GDPR" },
  { value: "UK_GDPR", label: "UK GDPR" },
  { value: "CCPA_CPRA", label: "California CCPA/CPRA" },
  { value: "LGPD", label: "Brazil LGPD" },
  { value: "POPIA", label: "South Africa POPIA" },
  { value: "PDPA_SG", label: "Singapore PDPA" },
  { value: "PIPL", label: "China PIPL" },
  { value: "OTHER", label: "Other" },
] as const;

export type DSARTypeValue = (typeof DSAR_TYPES)[number]["value"];
export type DataSubjectTypeValue = (typeof DATA_SUBJECT_TYPES)[number]["value"];
export type LegalBasisValue = (typeof LEGAL_BASES)[number]["value"];
export type TransferMechanismValue = (typeof TRANSFER_MECHANISMS)[number]["value"];
export type JurisdictionValue = (typeof JURISDICTIONS)[number]["value"];
