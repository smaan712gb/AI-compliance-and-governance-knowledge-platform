// ============================================
// SENTINEL — Core Type Definitions
// ============================================

// ---- Enums ----

export type SentinelTier = "FREE" | "PRO" | "EXPERT" | "STRATEGIC";

export type EventCategory =
  | "CONFLICT"
  | "TERRORISM"
  | "CYBER"
  | "ECONOMIC"
  | "POLITICAL"
  | "DISASTER"
  | "SANCTIONS"
  | "OTHER";

export type EventSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type CrisisLevel =
  | "critical"
  | "severe"
  | "elevated"
  | "guarded"
  | "low";

export type CrisisTrend = "escalating" | "stable" | "improving";

export type ScreeningRecommendation =
  | "block"
  | "enhanced_due_diligence"
  | "standard"
  | "clear";

// ---- Reasoning ----

export interface ReasoningRequest {
  headline: string;
  content: string;
  source?: string;
  countryCode?: string;
  context?: string;
}

export interface ReasoningChain {
  whatHappened: string;
  whyItMatters: string;
  whatHappensNext: string;
  whoIsAffected: string;
}

export interface ReasoningResponse {
  category: EventCategory;
  severity: EventSeverity;
  riskScore: number;
  reasoning: ReasoningChain;
  impactAnalysis: {
    primaryImpact: string;
    secondOrderEffects: string[];
    affectedSectors: string[];
    affectedCountries: string[];
  };
  actionableInsights: string[];
  entities: string[];
  reasoningTokens: number;
}

// ---- Bias Detection ----

export type BiasType = "omission" | "framing" | "emphasis" | "attribution";

export interface BiasAuditRequest {
  headline: string;
  content: string;
  source: string;
  region?: string;
}

export interface BiasAuditResult {
  hasBias: boolean;
  confidence: number;
  biasType: BiasType | null;
  explanation: string;
  alternativeFraming: string | null;
  recommendation: "accept" | "flag" | "override";
  sensitiveRegion: boolean;
  sensitiveTopic: boolean;
}

// ---- Financial Crime Screening ----

export interface ScreeningRequest {
  name: string;
  entityType: "person" | "organization" | "vessel" | "aircraft";
  countryCode?: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface SanctionsMatch {
  listName: string;
  matchedName: string;
  score: number;
  entityId: string;
  sanctionPrograms: string[];
  listingDate?: string;
}

export interface PEPMatch {
  name: string;
  position: string;
  country: string;
  score: number;
  level: "national" | "regional" | "local";
}

export interface AdverseMediaHit {
  title: string;
  source: string;
  date: string;
  relevanceScore: number;
  summary: string;
}

export interface ComprehensiveScreeningResult {
  entityName: string;
  entityType: string;
  sanctionsScore: number;
  pepScore: number;
  adverseMediaScore: number;
  geographicRiskScore: number;
  compositeScore: number;
  recommendation: ScreeningRecommendation;
  sanctionsMatches: SanctionsMatch[];
  pepMatches: PEPMatch[];
  adverseMediaHits: AdverseMediaHit[];
  riskFactors: string[];
  screenedAt: string;
}

// ---- Crisis Index ----

export interface CrisisComponents {
  deadliness: number;
  civilianDanger: number;
  diffusion: number;
  fragmentation: number;
}

export interface CrisisIndicators {
  conflictEvents: number;
  fatalities: number;
  protestEvents: number;
  militaryActivity: number;
  internetOutages: number;
  newsVelocity: number;
}

export interface CrisisIndexScore {
  countryCode: string;
  countryName: string;
  score: number;
  level: CrisisLevel;
  trend: CrisisTrend;
  components: CrisisComponents;
  indicators: CrisisIndicators;
  lastUpdated: string;
}

// ---- Supply Chain ----

export interface SupplierProfile {
  name: string;
  countryCode: string;
  tier: number;
  criticality: "critical" | "high" | "medium" | "low";
  sector: string;
  upstream?: SupplierProfile[];
}

export interface SupplierRiskAssessment {
  supplierName: string;
  countryCode: string;
  tier: number;
  countryRiskScore: number;
  proximityRisk: number;
  cascadeRisk: number;
  compositeRisk: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  mitigations: MitigationOption[];
}

export interface MitigationOption {
  type: "alternative_supplier" | "safety_stock" | "alternative_route" | "insurance";
  description: string;
  estimatedCostReduction: number;
  implementationTime: string;
}

export interface PortfolioAnalysis {
  totalSuppliers: number;
  riskBreakdown: Record<string, number>;
  concentrationRisks: ConcentrationRisk[];
  singlePointsOfFailure: string[];
  highRiskCountries: string[];
  recommendations: string[];
}

export interface ConcentrationRisk {
  type: "country" | "tier" | "sector";
  value: string;
  supplierCount: number;
  percentageOfTotal: number;
  riskLevel: string;
}

// ---- API ----

export interface TierLimits {
  requestsPerMinute: number;
  requestsPerDay: number;
  reasoningCallsPerDay: number;
  screeningCallsPerDay: number;
  supplyChainAssessments: number;
  historicalDataDays: number;
  apiAccess: boolean;
  biasAudit: boolean;
  supplyChainModule: boolean;
}

export const SENTINEL_TIER_LIMITS: Record<SentinelTier, TierLimits> = {
  FREE: {
    requestsPerMinute: 10,
    requestsPerDay: 100,
    reasoningCallsPerDay: 5,
    screeningCallsPerDay: 10,
    supplyChainAssessments: 0,
    historicalDataDays: 7,
    apiAccess: false,
    biasAudit: false,
    supplyChainModule: false,
  },
  PRO: {
    requestsPerMinute: 60,
    requestsPerDay: 5000,
    reasoningCallsPerDay: 100,
    screeningCallsPerDay: 500,
    supplyChainAssessments: 50,
    historicalDataDays: 90,
    apiAccess: true,
    biasAudit: true,
    supplyChainModule: false,
  },
  EXPERT: {
    requestsPerMinute: 120,
    requestsPerDay: 20000,
    reasoningCallsPerDay: 500,
    screeningCallsPerDay: 2000,
    supplyChainAssessments: 200,
    historicalDataDays: 365,
    apiAccess: true,
    biasAudit: true,
    supplyChainModule: true,
  },
  STRATEGIC: {
    requestsPerMinute: 600,
    requestsPerDay: 100000,
    reasoningCallsPerDay: 5000,
    screeningCallsPerDay: 10000,
    supplyChainAssessments: 1000,
    historicalDataDays: 730,
    apiAccess: true,
    biasAudit: true,
    supplyChainModule: true,
  },
};
