// ============================================
// ERP SYSTEMS & REGULATION SUPPORT MATRIX
// Static reference data for ERP impact analysis
// ============================================

export interface ERPSystem {
  id: string;
  name: string;
  vendor: string;
  nativeSupport: string[];    // regulation IDs handled natively
  addonSupport: string[];     // regulation IDs handled via add-on
  partnerSupport: string[];   // regulation IDs handled via partner solutions
}

export interface RegulationRequirement {
  id: string;
  name: string;
  domain: string;             // "e-invoicing", "tax-compliance", "cybersecurity", etc.
  jurisdiction: string;       // Country code (ISO 3166-1 alpha-2) or "EU" / "GLOBAL"
  deadline: string | null;    // ISO date string or null if already in effect
  requirements: string[];     // What the regulation requires
  penalties: string | null;   // Penalty description
}

export interface GapAnalysisItem {
  regulationId: string;
  regulationName: string;
  domain: string;
  jurisdiction: string;
  deadline: string | null;
  coverage: "NATIVE" | "ADDON" | "PARTNER" | "GAP";
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  requirements: string[];
  penalties: string | null;
}

export interface StaticGapAnalysis {
  erpSystem: ERPSystem;
  applicableRegulations: RegulationRequirement[];
  gaps: GapAnalysisItem[];
  summary: {
    total: number;
    native: number;
    addon: number;
    partner: number;
    gap: number;
    criticalGaps: number;
  };
}

// ============================================
// ERP SYSTEMS DATABASE
// ============================================

export const ERP_SYSTEMS: Record<string, ERPSystem> = {
  sap: {
    id: "sap",
    name: "SAP S/4HANA",
    vendor: "SAP SE",
    nativeSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "saft-portugal",
      "saft-norway",
      "gdpr",
      "csrd",
    ],
    addonSupport: [
      "ksef-poland",
      "fatoora-saudi",
      "cfdi-mexico",
      "myinvois-malaysia",
      "ro-efactura-romania",
      "ppf-france",
      "verifactu-spain",
      "peppol-belgium",
      "iso27001",
    ],
    partnerSupport: [
      "nfe-brazil",
      "gst-einvoice-india",
      "soc2",
      "nis2",
      "dora",
    ],
  },
  oracle: {
    id: "oracle",
    name: "Oracle ERP Cloud",
    vendor: "Oracle Corporation",
    nativeSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "cfdi-mexico",
      "gdpr",
    ],
    addonSupport: [
      "ksef-poland",
      "ppf-france",
      "fatoora-saudi",
      "nfe-brazil",
      "ro-efactura-romania",
      "saft-portugal",
      "peppol-belgium",
      "csrd",
    ],
    partnerSupport: [
      "gst-einvoice-india",
      "myinvois-malaysia",
      "verifactu-spain",
      "saft-norway",
      "soc2",
      "iso27001",
      "nis2",
      "dora",
    ],
  },
  netsuite: {
    id: "netsuite",
    name: "Oracle NetSuite",
    vendor: "Oracle Corporation",
    nativeSupport: [
      "gdpr",
    ],
    addonSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "cfdi-mexico",
      "nfe-brazil",
      "ppf-france",
      "fatoora-saudi",
    ],
    partnerSupport: [
      "ksef-poland",
      "ro-efactura-romania",
      "gst-einvoice-india",
      "myinvois-malaysia",
      "verifactu-spain",
      "peppol-belgium",
      "saft-portugal",
      "saft-norway",
      "soc2",
      "iso27001",
      "nis2",
      "dora",
      "csrd",
    ],
  },
  dynamics365: {
    id: "dynamics365",
    name: "Microsoft Dynamics 365",
    vendor: "Microsoft Corporation",
    nativeSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "saft-norway",
      "gdpr",
    ],
    addonSupport: [
      "ksef-poland",
      "ppf-france",
      "cfdi-mexico",
      "ro-efactura-romania",
      "peppol-belgium",
      "verifactu-spain",
      "saft-portugal",
      "iso27001",
      "csrd",
    ],
    partnerSupport: [
      "fatoora-saudi",
      "nfe-brazil",
      "gst-einvoice-india",
      "myinvois-malaysia",
      "soc2",
      "nis2",
      "dora",
    ],
  },
  infor: {
    id: "infor",
    name: "Infor CloudSuite",
    vendor: "Infor (Koch Industries)",
    nativeSupport: [
      "gdpr",
    ],
    addonSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "cfdi-mexico",
      "ppf-france",
      "saft-norway",
    ],
    partnerSupport: [
      "ksef-poland",
      "ro-efactura-romania",
      "nfe-brazil",
      "gst-einvoice-india",
      "fatoora-saudi",
      "myinvois-malaysia",
      "verifactu-spain",
      "peppol-belgium",
      "saft-portugal",
      "soc2",
      "iso27001",
      "nis2",
      "dora",
      "csrd",
    ],
  },
  workday: {
    id: "workday",
    name: "Workday Financial Management",
    vendor: "Workday, Inc.",
    nativeSupport: [
      "gdpr",
      "soc2",
    ],
    addonSupport: [
      "xrechnung-germany",
      "sdi-italy",
      "csrd",
    ],
    partnerSupport: [
      "ksef-poland",
      "ppf-france",
      "cfdi-mexico",
      "nfe-brazil",
      "ro-efactura-romania",
      "fatoora-saudi",
      "gst-einvoice-india",
      "myinvois-malaysia",
      "verifactu-spain",
      "peppol-belgium",
      "saft-portugal",
      "saft-norway",
      "iso27001",
      "nis2",
      "dora",
    ],
  },
  sage: {
    id: "sage",
    name: "Sage Intacct / X3",
    vendor: "The Sage Group plc",
    nativeSupport: [
      "gdpr",
    ],
    addonSupport: [
      "sdi-italy",
      "xrechnung-germany",
      "ppf-france",
      "peppol-belgium",
    ],
    partnerSupport: [
      "ksef-poland",
      "cfdi-mexico",
      "nfe-brazil",
      "ro-efactura-romania",
      "fatoora-saudi",
      "gst-einvoice-india",
      "myinvois-malaysia",
      "verifactu-spain",
      "saft-portugal",
      "saft-norway",
      "soc2",
      "iso27001",
      "nis2",
      "dora",
      "csrd",
    ],
  },
  xero: {
    id: "xero",
    name: "Xero",
    vendor: "Xero Limited",
    nativeSupport: [
      "gdpr",
    ],
    addonSupport: [
      "peppol-belgium",
      "xrechnung-germany",
      "sdi-italy",
    ],
    partnerSupport: [
      "ksef-poland",
      "ppf-france",
      "cfdi-mexico",
      "nfe-brazil",
      "ro-efactura-romania",
      "fatoora-saudi",
      "gst-einvoice-india",
      "myinvois-malaysia",
      "verifactu-spain",
      "saft-portugal",
      "saft-norway",
      "soc2",
      "iso27001",
      "nis2",
      "dora",
      "csrd",
    ],
  },
};

// ============================================
// REGULATIONS DATABASE
// ============================================

export const REGULATIONS: Record<string, RegulationRequirement> = {
  // --- E-INVOICING MANDATES ---

  "sdi-italy": {
    id: "sdi-italy",
    name: "Italy SDI E-Invoicing (FatturaPA)",
    domain: "e-invoicing",
    jurisdiction: "IT",
    deadline: null, // Already mandatory since 2019
    requirements: [
      "All B2B and B2G invoices must be issued in FatturaPA XML format",
      "Invoices must be transmitted through SDI (Sistema di Interscambio)",
      "Digital signature required on invoices",
      "Invoice archiving for 10 years in electronic format",
    ],
    penalties: "Administrative sanctions from 90% to 180% of the VAT amount, with a minimum of EUR 500 per invoice",
  },

  "ppf-france": {
    id: "ppf-france",
    name: "France PPF B2B E-Invoicing",
    domain: "e-invoicing",
    jurisdiction: "FR",
    deadline: "2026-09-01",
    requirements: [
      "All businesses must be able to receive e-invoices by September 2026",
      "Large enterprises must emit e-invoices from September 2026",
      "Mid-size and SMEs must emit by September 2027",
      "Supported formats: Factur-X, UBL, CII",
      "E-reporting of B2C transactions and cross-border operations",
    ],
    penalties: "EUR 15 per non-compliant invoice (capped at EUR 15,000 per year)",
  },

  "xrechnung-germany": {
    id: "xrechnung-germany",
    name: "Germany B2B E-Invoicing (XRechnung)",
    domain: "e-invoicing",
    jurisdiction: "DE",
    deadline: "2025-01-01",
    requirements: [
      "Mandatory reception of structured e-invoices for domestic B2B from January 2025",
      "Emission obligations phased through 2027-2028",
      "Accepted formats: XRechnung, CII, or any EN 16931-compliant format",
      "B2G already mandatory via Peppol since 2020",
    ],
    penalties: "Non-deductibility of input VAT for non-compliant invoices; administrative fines up to EUR 5,000",
  },

  "ksef-poland": {
    id: "ksef-poland",
    name: "Poland KSeF E-Invoicing",
    domain: "e-invoicing",
    jurisdiction: "PL",
    deadline: "2026-02-01",
    requirements: [
      "SAF-T XML format (FA schema) for all structured invoices",
      "Real-time clearance via National e-Invoice System (KSeF)",
      "Digital signature (qualified electronic signature or trusted profile)",
      "All VAT-registered taxpayers must issue invoices via KSeF",
    ],
    penalties: "Up to 100% of the VAT amount shown on the invoice",
  },

  "verifactu-spain": {
    id: "verifactu-spain",
    name: "Spain VeriFactu Anti-Fraud System",
    domain: "e-invoicing",
    jurisdiction: "ES",
    deadline: "2025-07-01",
    requirements: [
      "Invoice verification and anti-fraud reporting system",
      "Real-time or near-real-time reporting of invoice data to AEAT",
      "Integration with existing SII (Suministro Inmediato de Informacion) system",
      "Crea y Crece Law mandates B2B e-invoicing for companies >EUR 8M revenue",
    ],
    penalties: "Fines up to EUR 50,000 per fiscal year for non-compliance with software requirements",
  },

  "ro-efactura-romania": {
    id: "ro-efactura-romania",
    name: "Romania RO e-Factura",
    domain: "e-invoicing",
    jurisdiction: "RO",
    deadline: null, // Already mandatory from January 2025 for all domestic B2B
    requirements: [
      "Mandatory for all domestic B2B transactions from January 2025",
      "XML format compliant with Romanian e-Factura schema",
      "Real-time clearance through ANAF e-Factura platform",
      "SAF-T (D406) reporting also mandatory for large taxpayers",
    ],
    penalties: "Fines from RON 5,000 to RON 10,000 (approx. EUR 1,000-2,000) for B2B non-compliance",
  },

  "peppol-belgium": {
    id: "peppol-belgium",
    name: "Belgium Peppol B2B E-Invoicing",
    domain: "e-invoicing",
    jurisdiction: "BE",
    deadline: "2026-01-01",
    requirements: [
      "Mandatory B2B e-invoicing via Peppol network from January 2026",
      "B2G already mandatory via Peppol (Mercurius platform)",
      "UBL or CII format through Peppol Access Points",
      "Registration with a Peppol Access Point required",
    ],
    penalties: "Non-deductibility of VAT on non-compliant invoices; additional administrative sanctions",
  },

  "fatoora-saudi": {
    id: "fatoora-saudi",
    name: "Saudi Arabia FATOORA (ZATCA)",
    domain: "e-invoicing",
    jurisdiction: "SA",
    deadline: null, // Phase 2 integration ongoing in waves
    requirements: [
      "Phase 1 (Generation): mandatory since December 2021 for all VAT-registered taxpayers",
      "Phase 2 (Integration): direct integration with ZATCA platform, phased by revenue waves",
      "XML or PDF/A-3 with embedded XML format",
      "QR code on simplified invoices, cryptographic stamp on standard invoices",
      "UUID and sequential invoice counter required",
    ],
    penalties: "Fines from SAR 5,000 to SAR 50,000 per violation; repeat violations can result in higher penalties",
  },

  "gst-einvoice-india": {
    id: "gst-einvoice-india",
    name: "India GST E-Invoice",
    domain: "e-invoicing",
    jurisdiction: "IN",
    deadline: null, // Already mandatory for businesses above INR 5 crore
    requirements: [
      "Mandatory for businesses exceeding INR 5 crore annual turnover",
      "Invoice Registration Portal (IRP) generates IRN (Invoice Reference Number)",
      "JSON format invoice data submitted to IRP",
      "QR code with signed invoice data required on invoices",
      "Interoperability with GST returns (auto-population of GSTR-1)",
    ],
    penalties: "100% of tax due or INR 10,000 (whichever is higher) per non-compliant invoice",
  },

  "nfe-brazil": {
    id: "nfe-brazil",
    name: "Brazil NF-e (Nota Fiscal Eletronica)",
    domain: "e-invoicing",
    jurisdiction: "BR",
    deadline: null, // Mandatory since 2008
    requirements: [
      "All B2B product invoices must be issued as NF-e in XML format",
      "Real-time authorization by SEFAZ (state tax authority) before goods shipment",
      "Digital certificate (ICP-Brasil A1 or A3) required for signing",
      "NFS-e for service invoices being standardized nationally",
      "DANFE (auxiliary document) must accompany goods in transit",
    ],
    penalties: "Fines from 10% to 100% of the invoice value; goods seized without valid NF-e",
  },

  "cfdi-mexico": {
    id: "cfdi-mexico",
    name: "Mexico CFDI 4.0",
    domain: "e-invoicing",
    jurisdiction: "MX",
    deadline: null, // Already mandatory
    requirements: [
      "All fiscal documents must use CFDI 4.0 format (XML)",
      "Recipient tax details required: RFC, tax regime, postal code",
      "Certified PAC (Authorized Certification Provider) must stamp each invoice",
      "Cancellation process requires recipient acceptance",
      "Complement documents for payroll, payments, foreign trade",
    ],
    penalties: "Fines from MXN 17,020 to MXN 97,330 per non-compliant invoice; deductibility denied",
  },

  "myinvois-malaysia": {
    id: "myinvois-malaysia",
    name: "Malaysia MyInvois E-Invoicing",
    domain: "e-invoicing",
    jurisdiction: "MY",
    deadline: "2025-08-01",
    requirements: [
      "Mandatory from August 2025 for businesses with annual turnover >MYR 25 million",
      "Subsequent phases extend to all businesses",
      "Invoices must be validated through LHDN MyInvois portal",
      "API integration or MyInvois portal for invoice submission",
      "XML or JSON format with digital signature",
    ],
    penalties: "Fine not exceeding MYR 50,000 or imprisonment up to 3 years, or both",
  },

  // --- TAX COMPLIANCE ---

  "saft-portugal": {
    id: "saft-portugal",
    name: "Portugal SAF-T Reporting",
    domain: "tax-compliance",
    jurisdiction: "PT",
    deadline: null, // Mandatory since 2008
    requirements: [
      "Monthly SAF-T billing file submissions to Autoridade Tributaria (AT)",
      "SAF-T (PT) XML format covering invoices, payments, and accounting entries",
      "Annual SAF-T accounting file submission",
      "ERP/accounting software must be certified by AT",
    ],
    penalties: "Fines from EUR 150 to EUR 25,000 depending on company turnover and violation type",
  },

  "saft-norway": {
    id: "saft-norway",
    name: "Norway SAF-T Financial",
    domain: "tax-compliance",
    jurisdiction: "NO",
    deadline: null, // Mandatory since January 2020
    requirements: [
      "SAF-T Financial data file mandatory since 1 January 2020",
      "Must be produced on request by Skatteetaten (tax authority)",
      "XML format following Norwegian SAF-T Financial schema",
      "Covers general ledger, accounts receivable/payable, and fixed assets",
    ],
    penalties: "Daily coercive fines until compliance; additional administrative penalties",
  },

  // --- CYBERSECURITY ---

  soc2: {
    id: "soc2",
    name: "SOC 2 Attestation",
    domain: "cybersecurity",
    jurisdiction: "GLOBAL",
    deadline: null, // Ongoing — not a one-time deadline
    requirements: [
      "Security Trust Service Category (required): logical/physical access, system operations, change management",
      "Optional categories: Availability, Processing Integrity, Confidentiality, Privacy",
      "Type I: point-in-time assessment of control design",
      "Type II: assessment of control design AND operating effectiveness over 6-12 months",
      "Report issued by an independent CPA firm (not a certification)",
    ],
    penalties: "No statutory penalties — but loss of enterprise customer contracts and business opportunities",
  },

  iso27001: {
    id: "iso27001",
    name: "ISO/IEC 27001:2022",
    domain: "cybersecurity",
    jurisdiction: "GLOBAL",
    deadline: null, // Ongoing — certification based
    requirements: [
      "Establish, implement, maintain, and continually improve an ISMS",
      "93 controls organized into 4 themes: Organizational, People, Physical, Technological",
      "Risk assessment and treatment process",
      "Statement of Applicability (SoA) documenting control selections",
      "Internal audits and management reviews",
      "3-year certification cycle with annual surveillance audits",
    ],
    penalties: "No statutory penalties — but certification loss impacts business trust and contract eligibility",
  },

  nis2: {
    id: "nis2",
    name: "NIS2 Directive",
    domain: "cybersecurity",
    jurisdiction: "EU",
    deadline: "2024-10-17",
    requirements: [
      "Risk management measures for network and information systems",
      "Incident reporting: 24h early warning, 72h notification to CSIRT",
      "Supply chain security assessments",
      "Management body accountability and training",
      "Business continuity and crisis management",
      "Applies to essential and important entities across 18 sectors",
    ],
    penalties: "Up to EUR 10 million or 2% of global annual turnover for essential entities; EUR 7 million or 1.4% for important entities",
  },

  dora: {
    id: "dora",
    name: "DORA (Digital Operational Resilience Act)",
    domain: "cybersecurity",
    jurisdiction: "EU",
    deadline: "2025-01-17",
    requirements: [
      "ICT risk management framework with documented policies",
      "Incident reporting to competent authorities",
      "Digital operational resilience testing including threat-led penetration testing",
      "Third-party ICT risk management and oversight of critical providers",
      "Information sharing arrangements on cyber threats",
      "Applies to banks, insurers, investment firms, payment institutions, crypto-asset service providers",
    ],
    penalties: "Up to 1% of average daily worldwide turnover for up to 6 months; periodic penalty payments",
  },

  // --- DATA PRIVACY ---

  gdpr: {
    id: "gdpr",
    name: "GDPR (General Data Protection Regulation)",
    domain: "data-privacy",
    jurisdiction: "EU",
    deadline: null, // In effect since May 2018
    requirements: [
      "Lawful basis for processing personal data of EU residents",
      "Data subject rights: access, rectification, erasure, portability, objection",
      "Data Protection Impact Assessments (DPIAs) for high-risk processing",
      "Data Processing Agreements (DPAs) with all processors",
      "Data breach notification within 72 hours",
      "Data Protection Officer (DPO) appointment where required",
      "Records of processing activities (ROPA)",
    ],
    penalties: "Up to EUR 20 million or 4% of global annual turnover, whichever is higher",
  },

  // --- ESG & SUSTAINABILITY ---

  csrd: {
    id: "csrd",
    name: "CSRD (Corporate Sustainability Reporting Directive)",
    domain: "esg",
    jurisdiction: "EU",
    deadline: "2025-01-01",
    requirements: [
      "Double materiality assessment (impact materiality + financial materiality)",
      "Report against ESRS (European Sustainability Reporting Standards) - 12 standards",
      "Digital tagging in XHTML with iXBRL markup",
      "Limited assurance on sustainability reports (moving to reasonable assurance)",
      "Phase 1 (2024 reports): large public-interest entities >500 employees",
      "Phase 2 (2025 reports): other large companies meeting 2 of 3 thresholds",
      "Phase 3 (2026 reports): listed SMEs (opt-out available until 2028)",
    ],
    penalties: "Determined by EU member states; may include fines, public reprimand, and reporting injunctions",
  },
};

// ============================================
// JURISDICTION -> REGULATION MAPPING
// Maps country codes to applicable regulation IDs
// ============================================

const JURISDICTION_REGULATIONS: Record<string, string[]> = {
  // E-invoicing country-specific
  IT: ["sdi-italy", "gdpr", "nis2", "csrd"],
  FR: ["ppf-france", "gdpr", "nis2", "csrd"],
  DE: ["xrechnung-germany", "gdpr", "nis2", "csrd"],
  PL: ["ksef-poland", "gdpr", "nis2", "csrd"],
  ES: ["verifactu-spain", "gdpr", "nis2", "csrd"],
  RO: ["ro-efactura-romania", "gdpr", "nis2", "csrd"],
  BE: ["peppol-belgium", "gdpr", "nis2", "csrd"],
  SA: ["fatoora-saudi"],
  IN: ["gst-einvoice-india"],
  BR: ["nfe-brazil"],
  MX: ["cfdi-mexico"],
  MY: ["myinvois-malaysia"],
  PT: ["saft-portugal", "gdpr", "nis2", "csrd"],
  NO: ["saft-norway", "gdpr"],

  // EU countries without specific e-invoicing but with EU-wide regulations
  NL: ["gdpr", "nis2", "csrd"],
  SE: ["gdpr", "nis2", "csrd"],
  DK: ["gdpr", "nis2", "csrd"],
  FI: ["gdpr", "nis2", "csrd"],
  AT: ["gdpr", "nis2", "csrd"],
  IE: ["gdpr", "nis2", "csrd"],
  CZ: ["gdpr", "nis2", "csrd"],
  HU: ["gdpr", "nis2", "csrd"],
  GR: ["gdpr", "nis2", "csrd"],
  LT: ["gdpr", "nis2", "csrd"],
  LU: ["gdpr", "nis2", "csrd"],
  CH: ["gdpr"], // Not in EU but often GDPR-compliant

  // Non-EU
  GB: ["gdpr"], // UK GDPR
  US: [], // No universal mandates — industry-specific
  CA: [],
  JP: [],
  KR: [],
  CN: [],
  SG: [],
  AU: [],
  HK: [],
  TH: [],
  ID: [],
  AE: [],
  ZA: [],
  EG: [],
  NG: [],
  KE: [],
  IL: [],
  AR: [],
  CO: [],
  CL: [],
  TR: [],
};

// Industry-specific regulation applicability
const INDUSTRY_REGULATIONS: Record<string, string[]> = {
  "financial-services": ["soc2", "iso27001", "dora", "gdpr"],
  "insurance": ["soc2", "iso27001", "dora", "gdpr"],
  "healthcare": ["soc2", "iso27001", "gdpr"],
  "technology": ["soc2", "iso27001", "gdpr"],
  "manufacturing": ["iso27001", "csrd", "gdpr"],
  "retail": ["gdpr", "iso27001"],
  "energy": ["nis2", "iso27001", "csrd", "gdpr"],
  "telecommunications": ["nis2", "iso27001", "gdpr"],
  "government": ["nis2", "iso27001", "gdpr"],
  "education": ["gdpr", "iso27001"],
  "legal": ["gdpr", "iso27001", "soc2"],
  "real-estate": ["gdpr", "csrd"],
  "media": ["gdpr"],
  "transportation": ["nis2", "iso27001", "gdpr", "csrd"],
  "food-beverage": ["gdpr", "csrd"],
  "pharma": ["soc2", "iso27001", "gdpr", "csrd"],
  "automotive": ["iso27001", "nis2", "csrd", "gdpr"],
  "aerospace": ["iso27001", "nis2", "gdpr"],
  "consulting": ["soc2", "iso27001", "gdpr"],
  "nonprofit": ["gdpr"],
  "other": ["gdpr"],
};

// ============================================
// HELPER: COMPUTE URGENCY FROM DEADLINE
// ============================================

function computeUrgency(deadline: string | null): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (!deadline) return "MEDIUM"; // Already in effect — ongoing compliance

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "CRITICAL";   // Past deadline
  if (diffDays < 90) return "CRITICAL";  // Less than 3 months
  if (diffDays < 180) return "HIGH";     // Less than 6 months
  if (diffDays < 365) return "MEDIUM";   // Less than 1 year
  return "LOW";
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Given an ERP system ID, list of country codes, and industry,
 * find all applicable regulations and perform a static gap analysis
 * classifying each as NATIVE, ADDON, PARTNER, or GAP.
 */
export function analyzeERPGaps(
  erpId: string,
  countries: string[],
  industry: string,
): StaticGapAnalysis {
  const erp = ERP_SYSTEMS[erpId];

  // If ERP is not in our database, treat everything as a gap
  const fallbackErp: ERPSystem = {
    id: erpId,
    name: erpId,
    vendor: "Unknown",
    nativeSupport: [],
    addonSupport: [],
    partnerSupport: [],
  };

  const erpSystem = erp || fallbackErp;

  // Collect all applicable regulation IDs from countries + industry
  const regulationIds = new Set<string>();

  for (const country of countries) {
    const countryRegs = JURISDICTION_REGULATIONS[country];
    if (countryRegs) {
      for (const regId of countryRegs) {
        regulationIds.add(regId);
      }
    }
  }

  const industryRegs = INDUSTRY_REGULATIONS[industry];
  if (industryRegs) {
    for (const regId of industryRegs) {
      regulationIds.add(regId);
    }
  }

  // Build regulation objects and determine coverage
  const applicableRegulations: RegulationRequirement[] = [];
  const gaps: GapAnalysisItem[] = [];

  let native = 0;
  let addon = 0;
  let partner = 0;
  let gap = 0;
  let criticalGaps = 0;

  for (const regId of regulationIds) {
    const regulation = REGULATIONS[regId];
    if (!regulation) continue;

    applicableRegulations.push(regulation);

    let coverage: GapAnalysisItem["coverage"];

    if (erpSystem.nativeSupport.includes(regId)) {
      coverage = "NATIVE";
      native++;
    } else if (erpSystem.addonSupport.includes(regId)) {
      coverage = "ADDON";
      addon++;
    } else if (erpSystem.partnerSupport.includes(regId)) {
      coverage = "PARTNER";
      partner++;
    } else {
      coverage = "GAP";
      gap++;
    }

    const urgency = computeUrgency(regulation.deadline);
    if (coverage === "GAP" && (urgency === "CRITICAL" || urgency === "HIGH")) {
      criticalGaps++;
    }

    gaps.push({
      regulationId: regId,
      regulationName: regulation.name,
      domain: regulation.domain,
      jurisdiction: regulation.jurisdiction,
      deadline: regulation.deadline,
      coverage,
      urgency,
      requirements: regulation.requirements,
      penalties: regulation.penalties,
    });
  }

  // Sort: GAP first, then by urgency (CRITICAL > HIGH > MEDIUM > LOW)
  const urgencyOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const coverageOrder: Record<string, number> = {
    GAP: 0,
    PARTNER: 1,
    ADDON: 2,
    NATIVE: 3,
  };

  gaps.sort((a, b) => {
    const coverageDiff = coverageOrder[a.coverage] - coverageOrder[b.coverage];
    if (coverageDiff !== 0) return coverageDiff;
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return {
    erpSystem,
    applicableRegulations,
    gaps,
    summary: {
      total: applicableRegulations.length,
      native,
      addon,
      partner,
      gap,
      criticalGaps,
    },
  };
}

/**
 * Get a list of all available ERP system IDs and names
 * for use in dropdowns/selectors.
 */
export function getERPSystemList(): Array<{ id: string; name: string; vendor: string }> {
  return Object.values(ERP_SYSTEMS).map((erp) => ({
    id: erp.id,
    name: erp.name,
    vendor: erp.vendor,
  }));
}

/**
 * Get all regulations for a given domain.
 */
export function getRegulationsByDomain(domain: string): RegulationRequirement[] {
  return Object.values(REGULATIONS).filter((r) => r.domain === domain);
}

/**
 * Get regulations by jurisdiction (country code).
 */
export function getRegulationsByJurisdiction(jurisdiction: string): RegulationRequirement[] {
  const regIds = JURISDICTION_REGULATIONS[jurisdiction] || [];
  return regIds
    .map((id) => REGULATIONS[id])
    .filter((r): r is RegulationRequirement => r !== undefined);
}
