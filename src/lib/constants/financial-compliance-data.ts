// ================================================
// FINANCIAL COMPLIANCE CHECKER CONSTANTS
// ================================================

export const FINANCIAL_COMPLIANCE_DOMAINS = [
  {
    value: "AML_PROGRAM",
    label: "AML Program Assessment",
    description: "Anti-money laundering program design, BSA compliance, risk-based approach, and independent testing",
  },
  {
    value: "KYC_CDD",
    label: "KYC/CDD Compliance",
    description: "Customer due diligence, enhanced due diligence (EDD), beneficial ownership, and ongoing monitoring",
  },
  {
    value: "TRANSACTION_MONITORING",
    label: "Transaction Monitoring",
    description: "Suspicious activity detection, SAR/STR filing, threshold reporting, and pattern analysis",
  },
  {
    value: "SANCTIONS_SCREENING",
    label: "Sanctions Screening",
    description: "OFAC, EU sanctions, UN sanctions lists, PEP screening, and adverse media monitoring",
  },
  {
    value: "SOX_CONTROLS",
    label: "SOX Internal Controls",
    description: "Sarbanes-Oxley Section 302/404, ICFR, management assessment, and auditor attestation",
  },
  {
    value: "CRYPTO_MICA",
    label: "Crypto/MiCA Compliance",
    description: "Markets in Crypto-Assets regulation, travel rule, VASP licensing, and stablecoin reserves",
  },
] as const;

export const FINANCIAL_JURISDICTIONS = [
  // Americas
  { value: "US_FINCEN", label: "United States (FinCEN/BSA)", region: "americas" },
  { value: "US_SEC", label: "United States (SEC/SOX)", region: "americas" },
  { value: "US_NY_DFS", label: "New York (DFS)", region: "americas" },
  { value: "CA_FINTRAC", label: "Canada (FINTRAC)", region: "americas" },
  { value: "BR_BACEN", label: "Brazil (BACEN)", region: "americas" },
  // Europe
  { value: "EU_AMLD6", label: "European Union (AMLD6)", region: "europe" },
  { value: "EU_MICA", label: "European Union (MiCA)", region: "europe" },
  { value: "UK_FCA", label: "United Kingdom (FCA)", region: "europe" },
  { value: "CH_FINMA", label: "Switzerland (FINMA)", region: "europe" },
  { value: "DE_BAFIN", label: "Germany (BaFin)", region: "europe" },
  // APAC
  { value: "SG_MAS", label: "Singapore (MAS)", region: "apac" },
  { value: "HK_SFC", label: "Hong Kong (SFC/HKMA)", region: "apac" },
  { value: "AU_AUSTRAC", label: "Australia (AUSTRAC)", region: "apac" },
  { value: "JP_FSA", label: "Japan (FSA/JFSA)", region: "apac" },
  // MENA
  { value: "AE_CBUAE", label: "UAE (CBUAE/DFSA)", region: "mena" },
  { value: "SA_SAMA", label: "Saudi Arabia (SAMA)", region: "mena" },
] as const;

export const FINANCIAL_ENTITY_TYPES = [
  { value: "BANK", label: "Bank / Credit Union" },
  { value: "FINTECH", label: "Fintech / Neobank" },
  { value: "INSURANCE", label: "Insurance Company" },
  { value: "BROKER_DEALER", label: "Broker-Dealer / Investment Firm" },
  { value: "MSB", label: "Money Services Business (MSB)" },
  { value: "CRYPTO_EXCHANGE", label: "Crypto Exchange / VASP" },
  { value: "PAYMENT_PROCESSOR", label: "Payment Processor / PSP" },
  { value: "ASSET_MANAGER", label: "Asset Manager / Fund" },
  { value: "CORPORATE_TREASURY", label: "Corporate Treasury" },
] as const;

export const TRANSACTION_VOLUME = [
  { value: "LOW", label: "Under 10,000/month" },
  { value: "MEDIUM", label: "10,000-100,000/month" },
  { value: "HIGH", label: "100,000-1M/month" },
  { value: "VERY_HIGH", label: "Over 1M/month" },
] as const;

export const FINANCIAL_SYSTEMS_USED = [
  { value: "CORE_BANKING", label: "Core Banking System" },
  { value: "AML_SCREENING", label: "AML Screening Tool (e.g., Actimize, Fircosoft)" },
  { value: "KYC_PLATFORM", label: "KYC/IDV Platform (e.g., Jumio, Onfido, Trulioo)" },
  { value: "TRANSACTION_MONITORING", label: "Transaction Monitoring System (e.g., NICE Actimize, SAS)" },
  { value: "SANCTIONS_SCREENING", label: "Sanctions Screening (e.g., World-Check, Dow Jones)" },
  { value: "PAYMENT_GATEWAY", label: "Payment Gateway / Processor" },
  { value: "CRYPTO_CUSTODY", label: "Crypto Custody / Wallet" },
  { value: "TRADING_PLATFORM", label: "Trading / OMS Platform" },
  { value: "GRC_PLATFORM", label: "GRC / Compliance Platform" },
  { value: "NONE", label: "No dedicated compliance tools" },
] as const;

export const FINANCIAL_COMPLIANCE_CONCERNS = [
  { value: "SAR_FILING", label: "SAR/STR filing obligations and timelines" },
  { value: "CDD_EDD", label: "CDD/EDD requirements and risk scoring" },
  { value: "PEP_SCREENING", label: "PEP screening and ongoing monitoring" },
  { value: "SANCTIONS_COMPLIANCE", label: "Sanctions list compliance (OFAC/EU/UN)" },
  { value: "SOX_TESTING", label: "SOX control testing and documentation" },
  { value: "CRYPTO_TRAVEL_RULE", label: "Crypto travel rule compliance" },
  { value: "BENEFICIAL_OWNERSHIP", label: "Beneficial ownership / CTA requirements" },
  { value: "CROSS_BORDER_PAYMENTS", label: "Cross-border payment compliance" },
  { value: "REGULATOR_EXAM_PREP", label: "Regulatory exam / audit preparation" },
  { value: "RISK_ASSESSMENT", label: "AML/CFT risk assessment methodology" },
] as const;

export type FinancialComplianceDomain = (typeof FINANCIAL_COMPLIANCE_DOMAINS)[number]["value"];
export type FinancialJurisdiction = (typeof FINANCIAL_JURISDICTIONS)[number]["value"];
