// ============================================
// ENTERPRISE RISK REGISTER CONSTANTS
// ============================================

export const RISK_CATEGORIES = [
  { value: "CYBER_SECURITY", label: "Cybersecurity Risk", icon: "shield" },
  { value: "DATA_PRIVACY", label: "Data Privacy Risk", icon: "lock" },
  { value: "REGULATORY", label: "Regulatory / Compliance Risk", icon: "scale" },
  { value: "OPERATIONAL", label: "Operational Risk", icon: "cog" },
  { value: "FINANCIAL", label: "Financial Risk", icon: "dollar" },
  { value: "REPUTATIONAL", label: "Reputational Risk", icon: "megaphone" },
  { value: "STRATEGIC", label: "Strategic Risk", icon: "target" },
  { value: "THIRD_PARTY", label: "Third-Party / Vendor Risk", icon: "link" },
  { value: "AI_MODEL", label: "AI / Model Risk", icon: "brain" },
] as const;

export const LIKELIHOOD_SCALE = [
  { value: 1, label: "Rare", description: "May occur only in exceptional circumstances (<5%)" },
  { value: 2, label: "Unlikely", description: "Could occur but not expected (5–25%)" },
  { value: 3, label: "Possible", description: "Might occur at some time (25–50%)" },
  { value: 4, label: "Likely", description: "Will probably occur in most circumstances (50–75%)" },
  { value: 5, label: "Almost Certain", description: "Expected to occur in most circumstances (>75%)" },
] as const;

export const IMPACT_SCALE = [
  { value: 1, label: "Negligible", description: "Minimal financial or operational impact (<$10K)" },
  { value: 2, label: "Minor", description: "Minor disruption, contained within a team ($10K–$100K)" },
  { value: 3, label: "Moderate", description: "Significant but recoverable, cross-department impact ($100K–$1M)" },
  { value: 4, label: "Major", description: "Serious impact on operations, regulatory scrutiny ($1M–$10M)" },
  { value: 5, label: "Critical", description: "Existential threat, severe regulatory action, reputational crisis (>$10M)" },
] as const;

export const RISK_STATUSES = [
  { value: "OPEN", label: "Open", color: "red" },
  { value: "MITIGATING", label: "Mitigating", color: "orange" },
  { value: "MONITORING", label: "Monitoring", color: "yellow" },
  { value: "ACCEPTED", label: "Accepted", color: "blue" },
  { value: "CLOSED", label: "Closed", color: "green" },
] as const;

export const RISK_TREATMENT_OPTIONS = [
  { value: "mitigate", label: "Mitigate", description: "Reduce likelihood or impact through controls" },
  { value: "transfer", label: "Transfer", description: "Transfer risk via insurance or outsourcing" },
  { value: "accept", label: "Accept", description: "Accept risk within appetite with monitoring" },
  { value: "avoid", label: "Avoid", description: "Eliminate risk by stopping the activity" },
] as const;

/** Get risk score color based on likelihood × impact */
export function getRiskScoreColor(score: number): string {
  if (score >= 20) return "red";
  if (score >= 12) return "orange";
  if (score >= 6) return "yellow";
  return "green";
}

/** Get risk score label */
export function getRiskScoreLabel(score: number): string {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

export type RiskCategoryValue = (typeof RISK_CATEGORIES)[number]["value"];
export type RiskStatusValue = (typeof RISK_STATUSES)[number]["value"];
