// ================================================
// HIPAA COMPLIANCE CHECKER CONSTANTS
// ================================================

export const HIPAA_COMPLIANCE_DOMAINS = [
  {
    value: "PHI_SAFEGUARDS",
    label: "PHI Safeguards (Administrative, Physical, Technical)",
    description: "HIPAA Security Rule safeguards, encryption requirements, and access controls for protected health information",
  },
  {
    value: "ACCESS_AUDIT",
    label: "Access Controls & Audit Logs",
    description: "User authentication, role-based access, audit trail requirements, and session management",
  },
  {
    value: "BREACH_NOTIFICATION",
    label: "Breach Notification Rule",
    description: "60-day notification requirements, OCR reporting, state AG notification, and media notice thresholds",
  },
  {
    value: "BAA_MANAGEMENT",
    label: "Business Associate Agreements",
    description: "BAA requirements, subcontractor obligations, downstream compliance, and liability allocation",
  },
  {
    value: "TRAINING_AWARENESS",
    label: "Employee Training & Awareness",
    description: "Workforce training requirements, security awareness, sanctions for violations, and documentation",
  },
  {
    value: "RISK_ANALYSIS",
    label: "Risk Analysis & Management",
    description: "HIPAA Security Rule risk analysis (45 CFR 164.308(a)(1)), risk management plans, and remediation tracking",
  },
] as const;

export const HIPAA_JURISDICTIONS = [
  // Federal
  { value: "US_FEDERAL_HHS", label: "US Federal (HHS/OCR)", region: "federal" },
  { value: "US_FEDERAL_HITECH", label: "HITECH Act", region: "federal" },
  // State-specific
  { value: "US_CA_CMIA", label: "California (CMIA)", region: "state" },
  { value: "US_NY_SHIELD", label: "New York (SHIELD Act)", region: "state" },
  { value: "US_TX_HB300", label: "Texas (HB 300)", region: "state" },
  { value: "US_MA_201CMR17", label: "Massachusetts (201 CMR 17.00)", region: "state" },
  { value: "US_FL", label: "Florida", region: "state" },
  { value: "US_IL", label: "Illinois", region: "state" },
  { value: "US_NJ", label: "New Jersey", region: "state" },
  { value: "US_CT", label: "Connecticut", region: "state" },
] as const;

export const HIPAA_ENTITY_TYPES = [
  { value: "COVERED_ENTITY", label: "Covered Entity (health plan, provider, clearinghouse)" },
  { value: "BUSINESS_ASSOCIATE", label: "Business Associate" },
  { value: "SUBCONTRACTOR", label: "Subcontractor (of a BA)" },
  { value: "HYBRID_ENTITY", label: "Hybrid Entity" },
] as const;

export const HIPAA_ORGANIZATION_SIZE = [
  { value: "1-50", label: "1-50 employees" },
  { value: "51-250", label: "51-250 employees" },
  { value: "251-1000", label: "251-1,000 employees" },
  { value: "1001-5000", label: "1,001-5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
] as const;

export const HIPAA_SYSTEMS_USED = [
  { value: "EHR_EMR", label: "EHR/EMR System (e.g., Epic, Cerner, Allscripts)" },
  { value: "TELEHEALTH", label: "Telehealth Platform" },
  { value: "CLOUD_HOSTING", label: "Cloud Hosting (AWS, Azure, GCP)" },
  { value: "MEDICAL_DEVICES", label: "Medical Devices / IoT" },
  { value: "PATIENT_PORTAL", label: "Patient Portal" },
  { value: "BILLING_SYSTEM", label: "Billing / Revenue Cycle System" },
  { value: "MOBILE_HEALTH", label: "Mobile Health Apps" },
  { value: "LAB_SYSTEM", label: "Laboratory Information System (LIS)" },
  { value: "PHARMACY_SYSTEM", label: "Pharmacy Management System" },
  { value: "NONE", label: "No dedicated systems" },
] as const;

export const HIPAA_COMPLIANCE_CONCERNS = [
  { value: "PHI_ENCRYPTION", label: "PHI encryption at rest and in transit" },
  { value: "MINIMUM_NECESSARY", label: "Minimum necessary standard compliance" },
  { value: "RIGHT_OF_ACCESS", label: "Patient right of access (45 CFR 164.524)" },
  { value: "BREACH_TIMELINE", label: "Breach notification timelines (60-day rule)" },
  { value: "BAA_REQUIREMENTS", label: "BAA requirements and vendor management" },
  { value: "HITECH_PENALTIES", label: "HITECH Act penalty tiers and enforcement" },
  { value: "TELEHEALTH_COMPLIANCE", label: "Telehealth PHI protections" },
  { value: "STATE_AG_ENFORCEMENT", label: "State AG enforcement actions" },
  { value: "AUDIT_READINESS", label: "OCR audit readiness and documentation" },
  { value: "DE_IDENTIFICATION", label: "PHI de-identification (Safe Harbor / Expert Determination)" },
] as const;

export type HIPAAComplianceDomain = (typeof HIPAA_COMPLIANCE_DOMAINS)[number]["value"];
export type HIPAAJurisdiction = (typeof HIPAA_JURISDICTIONS)[number]["value"];
