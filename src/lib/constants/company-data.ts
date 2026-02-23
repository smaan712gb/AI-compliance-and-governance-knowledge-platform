// ============================================
// COMPANY PROFILE OPTIONS
// ============================================

export const INDUSTRIES = [
  { value: "financial-services", label: "Financial Services & Banking" },
  { value: "healthcare", label: "Healthcare & Life Sciences" },
  { value: "technology", label: "Technology & Software" },
  { value: "manufacturing", label: "Manufacturing & Industrial" },
  { value: "retail", label: "Retail & E-Commerce" },
  { value: "energy", label: "Energy & Utilities" },
  { value: "telecommunications", label: "Telecommunications" },
  { value: "insurance", label: "Insurance" },
  { value: "government", label: "Government & Public Sector" },
  { value: "education", label: "Education & Research" },
  { value: "legal", label: "Legal & Professional Services" },
  { value: "real-estate", label: "Real Estate & Construction" },
  { value: "media", label: "Media & Entertainment" },
  { value: "transportation", label: "Transportation & Logistics" },
  { value: "food-beverage", label: "Food & Beverage" },
  { value: "pharma", label: "Pharmaceutical & Biotech" },
  { value: "automotive", label: "Automotive" },
  { value: "aerospace", label: "Aerospace & Defense" },
  { value: "consulting", label: "Consulting & Advisory" },
  { value: "nonprofit", label: "Nonprofit & NGO" },
  { value: "other", label: "Other" },
] as const;

export const COMPANY_SIZES = [
  { value: "1-50", label: "1-50 employees" },
  { value: "51-250", label: "51-250 employees" },
  { value: "251-1000", label: "251-1,000 employees" },
  { value: "1001-5000", label: "1,001-5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
] as const;

export const REVENUE_RANGES = [
  { value: "$0-1M", label: "Under $1M" },
  { value: "$1M-10M", label: "$1M - $10M" },
  { value: "$10M-100M", label: "$10M - $100M" },
  { value: "$100M-1B", label: "$100M - $1B" },
  { value: "$1B+", label: "Over $1B" },
] as const;

export const ERP_SYSTEMS = [
  { value: "sap", label: "SAP S/4HANA" },
  { value: "oracle", label: "Oracle ERP Cloud / NetSuite" },
  { value: "netsuite", label: "Oracle NetSuite" },
  { value: "dynamics365", label: "Microsoft Dynamics 365" },
  { value: "infor", label: "Infor CloudSuite" },
  { value: "workday", label: "Workday" },
  { value: "sage", label: "Sage Intacct / X3" },
  { value: "epicor", label: "Epicor Kinetic" },
  { value: "ifs", label: "IFS Cloud" },
  { value: "unit4", label: "Unit4 ERP" },
  { value: "acumatica", label: "Acumatica Cloud ERP" },
  { value: "odoo", label: "Odoo" },
  { value: "quickbooks", label: "QuickBooks / Intuit" },
  { value: "xero", label: "Xero" },
  { value: "custom", label: "Custom / In-House" },
  { value: "none", label: "No ERP System" },
  { value: "other", label: "Other" },
] as const;

export const COMPLIANCE_DOMAINS = [
  { value: "ai-governance", label: "AI Governance & EU AI Act" },
  { value: "e-invoicing", label: "E-Invoicing & Digital Tax" },
  { value: "tax-compliance", label: "Tax Compliance & SAF-T" },
  { value: "cybersecurity", label: "Cybersecurity & SOC 2" },
  { value: "data-privacy", label: "Data Privacy & GDPR" },
  { value: "esg", label: "ESG & Sustainability Reporting" },
  { value: "fintech", label: "Fintech & AML/KYC" },
  { value: "hr-compliance", label: "HR & Employment Law" },
] as const;

export const COUNTRIES = [
  // North America
  { value: "US", label: "United States", region: "americas" },
  { value: "CA", label: "Canada", region: "americas" },
  { value: "MX", label: "Mexico", region: "americas" },
  // Europe — Major
  { value: "GB", label: "United Kingdom", region: "europe" },
  { value: "DE", label: "Germany", region: "europe" },
  { value: "FR", label: "France", region: "europe" },
  { value: "IT", label: "Italy", region: "europe" },
  { value: "ES", label: "Spain", region: "europe" },
  { value: "NL", label: "Netherlands", region: "europe" },
  { value: "BE", label: "Belgium", region: "europe" },
  { value: "SE", label: "Sweden", region: "europe" },
  { value: "NO", label: "Norway", region: "europe" },
  { value: "DK", label: "Denmark", region: "europe" },
  { value: "FI", label: "Finland", region: "europe" },
  { value: "CH", label: "Switzerland", region: "europe" },
  { value: "AT", label: "Austria", region: "europe" },
  { value: "IE", label: "Ireland", region: "europe" },
  { value: "PT", label: "Portugal", region: "europe" },
  { value: "PL", label: "Poland", region: "europe" },
  { value: "RO", label: "Romania", region: "europe" },
  { value: "CZ", label: "Czech Republic", region: "europe" },
  { value: "HU", label: "Hungary", region: "europe" },
  { value: "GR", label: "Greece", region: "europe" },
  { value: "LT", label: "Lithuania", region: "europe" },
  { value: "LU", label: "Luxembourg", region: "europe" },
  // Asia-Pacific
  { value: "JP", label: "Japan", region: "apac" },
  { value: "KR", label: "South Korea", region: "apac" },
  { value: "CN", label: "China", region: "apac" },
  { value: "SG", label: "Singapore", region: "apac" },
  { value: "AU", label: "Australia", region: "apac" },
  { value: "IN", label: "India", region: "apac" },
  { value: "MY", label: "Malaysia", region: "apac" },
  { value: "HK", label: "Hong Kong", region: "apac" },
  { value: "TH", label: "Thailand", region: "apac" },
  { value: "ID", label: "Indonesia", region: "apac" },
  // Middle East & Africa
  { value: "AE", label: "United Arab Emirates", region: "mena" },
  { value: "SA", label: "Saudi Arabia", region: "mena" },
  { value: "ZA", label: "South Africa", region: "mena" },
  { value: "EG", label: "Egypt", region: "mena" },
  { value: "NG", label: "Nigeria", region: "mena" },
  { value: "KE", label: "Kenya", region: "mena" },
  { value: "IL", label: "Israel", region: "mena" },
  // Latin America
  { value: "BR", label: "Brazil", region: "americas" },
  { value: "AR", label: "Argentina", region: "americas" },
  { value: "CO", label: "Colombia", region: "americas" },
  { value: "CL", label: "Chile", region: "americas" },
  { value: "TR", label: "Turkey", region: "europe" },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];
export type CompanySizeValue = (typeof COMPANY_SIZES)[number]["value"];
export type ERPSystemValue = (typeof ERP_SYSTEMS)[number]["value"];
export type ComplianceDomainValue = (typeof COMPLIANCE_DOMAINS)[number]["value"];
export type CountryValue = (typeof COUNTRIES)[number]["value"];
