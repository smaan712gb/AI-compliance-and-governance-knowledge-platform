// ============================================
// BOARD REPORT GENERATOR CONSTANTS
// ============================================

export const REPORT_TYPES = [
  { value: "QUARTERLY_CISO", label: "Quarterly CISO Report", description: "Comprehensive security posture update for the board" },
  { value: "ANNUAL_RISK", label: "Annual Risk Report", description: "Year-end risk landscape assessment and outlook" },
  { value: "AUDIT_COMMITTEE", label: "Audit Committee Briefing", description: "Compliance and control effectiveness for audit committee" },
  { value: "INCIDENT_BRIEF", label: "Incident Board Brief", description: "Post-incident briefing for the board (ad hoc)" },
  { value: "REGULATORY_UPDATE", label: "Regulatory Change Briefing", description: "New/emerging regulation impact assessment" },
] as const;

export const FOCUS_AREAS = [
  { value: "threat_landscape", label: "Threat Landscape & Intelligence" },
  { value: "compliance_posture", label: "Compliance Posture & Gaps" },
  { value: "risk_metrics", label: "Risk Metrics & KRIs" },
  { value: "vendor_risk", label: "Third-Party / Vendor Risk" },
  { value: "ai_governance", label: "AI Governance & Model Risk" },
  { value: "privacy_operations", label: "Privacy Operations (GDPR/CCPA)" },
  { value: "incident_response", label: "Incident Response & Readiness" },
  { value: "budget_investment", label: "Security Budget & Investment ROI" },
] as const;

export const PERIOD_PRESETS = [
  { value: "Q1", label: "Q1 (Jan–Mar)" },
  { value: "Q2", label: "Q2 (Apr–Jun)" },
  { value: "Q3", label: "Q3 (Jul–Sep)" },
  { value: "Q4", label: "Q4 (Oct–Dec)" },
  { value: "H1", label: "H1 (Jan–Jun)" },
  { value: "H2", label: "H2 (Jul–Dec)" },
  { value: "ANNUAL", label: "Full Year" },
  { value: "CUSTOM", label: "Custom Period" },
] as const;

export const BOARD_AUDIENCES = [
  { value: "full_board", label: "Full Board of Directors" },
  { value: "audit_committee", label: "Audit Committee" },
  { value: "risk_committee", label: "Risk Committee" },
  { value: "technology_committee", label: "Technology & Cybersecurity Committee" },
  { value: "executive_team", label: "Executive Leadership Team" },
] as const;

export type ReportTypeValue = (typeof REPORT_TYPES)[number]["value"];
export type FocusAreaValue = (typeof FOCUS_AREAS)[number]["value"];
export type PeriodPresetValue = (typeof PERIOD_PRESETS)[number]["value"];
