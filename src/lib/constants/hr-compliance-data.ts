// ============================================
// HR & EMPLOYMENT COMPLIANCE CHECKER CONSTANTS
// ============================================

export const HR_COMPLIANCE_DOMAINS = [
  {
    value: "AI_HIRING",
    label: "AI in Hiring & Recruitment",
    description: "Automated employment decision tools (AEDTs), bias audits, and AI hiring regulations",
  },
  {
    value: "PAY_TRANSPARENCY",
    label: "Pay Transparency & Equal Pay",
    description: "Salary range disclosure, pay gap reporting, and equal pay legislation",
  },
  {
    value: "REMOTE_WORK",
    label: "Remote & Global Workforce",
    description: "Cross-border employment, EOR compliance, and remote work regulations",
  },
  {
    value: "EMPLOYEE_DATA_PRIVACY",
    label: "Employee Data Privacy",
    description: "Workplace monitoring, biometric data, employee consent, and GDPR/CCPA for HR",
  },
  {
    value: "WHISTLEBLOWER",
    label: "Whistleblower Protection",
    description: "EU Whistleblower Directive, SOX, and internal reporting requirements",
  },
  {
    value: "DEI_REPORTING",
    label: "DEI & ESG Workforce Reporting",
    description: "CSRD social metrics, EEO-1, gender pay gap reporting, and board diversity",
  },
] as const;

export const HR_JURISDICTIONS = [
  // US — Federal + Key States
  { value: "US_FEDERAL", label: "United States (Federal)", region: "americas" },
  { value: "US_NYC", label: "New York City", region: "americas" },
  { value: "US_CA", label: "California", region: "americas" },
  { value: "US_CO", label: "Colorado", region: "americas" },
  { value: "US_WA", label: "Washington State", region: "americas" },
  { value: "US_IL", label: "Illinois", region: "americas" },
  { value: "US_MD", label: "Maryland", region: "americas" },
  { value: "US_CT", label: "Connecticut", region: "americas" },
  // EU
  { value: "EU", label: "European Union", region: "europe" },
  { value: "UK", label: "United Kingdom", region: "europe" },
  { value: "DE", label: "Germany", region: "europe" },
  { value: "FR", label: "France", region: "europe" },
  { value: "NL", label: "Netherlands", region: "europe" },
  { value: "IE", label: "Ireland", region: "europe" },
  // APAC
  { value: "AU", label: "Australia", region: "apac" },
  { value: "SG", label: "Singapore", region: "apac" },
  { value: "IN", label: "India", region: "apac" },
  { value: "JP", label: "Japan", region: "apac" },
  // LATAM
  { value: "BR", label: "Brazil", region: "americas" },
  // Middle East
  { value: "AE", label: "United Arab Emirates", region: "mena" },
] as const;

export const WORKFORCE_SIZE = [
  { value: "1-15", label: "1-15 employees" },
  { value: "16-100", label: "16-100 employees" },
  { value: "101-500", label: "101-500 employees" },
  { value: "501-4999", label: "501-4,999 employees" },
  { value: "5000+", label: "5,000+ employees" },
] as const;

export const HR_TOOLS_USED = [
  { value: "ATS", label: "Applicant Tracking System (ATS)" },
  { value: "AI_SCREENING", label: "AI Resume Screening / Ranking" },
  { value: "AI_INTERVIEW", label: "AI Video Interview Analysis" },
  { value: "AI_ASSESSMENT", label: "AI Skills / Personality Assessment" },
  { value: "AI_CHATBOT", label: "AI Chatbot for Candidates" },
  { value: "HRIS", label: "HRIS / HCM Platform" },
  { value: "PAYROLL", label: "Payroll System (e.g., ADP, Gusto)" },
  { value: "EMPLOYEE_MONITORING", label: "Employee Monitoring Software" },
  { value: "NONE", label: "No AI/automated tools" },
] as const;

export const HR_COMPLIANCE_CONCERNS = [
  { value: "BIAS_AUDIT", label: "Need bias audit for AI hiring tools" },
  { value: "PAY_POSTING", label: "Salary range posting requirements" },
  { value: "PAY_GAP_REPORT", label: "Pay gap reporting obligations" },
  { value: "CROSS_BORDER", label: "Cross-border employment compliance" },
  { value: "CONTRACTOR_CLASSIFICATION", label: "Contractor vs. employee classification" },
  { value: "BIOMETRIC_DATA", label: "Biometric data (BIPA) compliance" },
  { value: "WORKPLACE_MONITORING", label: "Employee monitoring legality" },
  { value: "WHISTLEBLOWER_CHANNELS", label: "Setting up whistleblower channels" },
  { value: "DEI_METRICS", label: "DEI/ESG reporting obligations" },
  { value: "TERMINATION_RULES", label: "Termination and severance rules" },
] as const;

export type HRComplianceDomain = (typeof HR_COMPLIANCE_DOMAINS)[number]["value"];
export type HRJurisdiction = (typeof HR_JURISDICTIONS)[number]["value"];
