# AIGovHub Product Vision: Universal Regulatory Compliance Intelligence Platform

---

## 1. Overview

**AIGovHub is transforming from an AI-governance-only platform into a universal regulatory compliance intelligence platform (ComplianceHub).** This document defines the full product vision, architecture, revenue model, and phased execution plan.

### Three Product Pillars

| # | Pillar | Description |
|---|--------|-------------|
| 1 | **Global Regulatory Intelligence Engine** | AI agents monitor every regulatory body worldwide and map regulations to company profiles |
| 2 | **Content & Blog Engine** | Autonomous 5-stage pipeline producing compliance content across all domains |
| 3 | **Vendor Lifecycle Management** | End-to-end vendor compliance automation from discovery through continuous monitoring |

### Branding Strategy

- **Target rebrand:** ComplianceHub.io (once 3+ compliance domains are live and generating traffic)
- **Current:** Keep AIGovHub branding and domain (<www.aigovhub.io>) until the rebrand threshold is reached
- AIGovHub becomes a sub-brand or redirect post-rebrand

---

## 2. Current State (Phase 0 — Live)

- **Domain:** AI Governance & EU AI Act Compliance
- **Content:** Auto-published via DeepSeek agent pipeline (hourly cron via cron-job.org)
- **Tools:** AI Act Compliance Checker, Vendor Risk Questionnaire Generator
- **Vendors:** 88 AI governance vendors tracked
- **Revenue:** Subscriptions ($19-99/mo), one-time toolkits ($49-499), affiliate (future)
- **Cost:** ~$1/day DeepSeek, ~$5/mo Railway, ~$12/yr domain

---

## 3. Three Product Pillars

### Pillar 1: Global Regulatory Intelligence Engine

The core product. AI agents monitor every regulatory body worldwide and map regulations to company profiles. When a regulation changes, the platform identifies which companies are affected, what action is required, and whether their existing ERP/tech stack handles it natively or needs a third-party solution.

#### Regulatory Source Database (400+ Sources Across 50+ Jurisdictions)

##### US Federal

| Source | Type | Focus Area |
|--------|------|------------|
| Congress.gov | Legislation tracker | Federal bills, resolutions, committee reports |
| Federal Register | Regulatory notices | Proposed rules, final rules, executive orders |
| SEC (Securities and Exchange Commission) | Enforcement + rulemaking | Securities regulation, climate disclosures, AI in finance |
| FTC (Federal Trade Commission) | Enforcement + guidance | Consumer protection, AI fairness, data privacy |
| IRS (Internal Revenue Service) | Tax guidance | Tax compliance, reporting requirements, e-filing mandates |
| NIST (National Institute of Standards and Technology) | Standards + frameworks | AI RMF, Cybersecurity Framework, Privacy Framework |
| CISA (Cybersecurity and Infrastructure Security Agency) | Advisories + directives | Cybersecurity mandates, critical infrastructure |
| FinCEN (Financial Crimes Enforcement Network) | Regulatory guidance | AML/BSA requirements, beneficial ownership |
| CFPB (Consumer Financial Protection Bureau) | Rulemaking + enforcement | Consumer finance, algorithmic lending, open banking |
| OCC / FDIC / Federal Reserve | Regulatory guidance | Bank supervision, capital requirements, fintech charters |
| HHS / OCR (Office for Civil Rights) | Enforcement + rulemaking | HIPAA privacy and security, health AI |
| DOL (Department of Labor) | Rulemaking + guidance | Employment law, ERISA, worker classification |
| OFAC (Office of Foreign Assets Control) | Sanctions lists + guidance | Sanctions compliance, SDN list updates |

##### US States

| State | Key Legislation | Focus Area |
|-------|----------------|------------|
| California | CCPA/CPRA, SB 1047 (AI Safety) | Privacy, AI governance, consumer rights |
| Colorado | Colorado AI Act (SB 24-205), CPA | AI risk management, privacy |
| New York | Local Law 144 (AI hiring), SHIELD Act | AI bias audits, cybersecurity |
| Illinois | BIPA, AIAED | Biometric privacy, AI in employment decisions |
| Texas | TDPSA, HB 2060 | Data privacy, AI regulation |
| Virginia | VCDPA | Consumer data protection |
| Connecticut | CTDPA, SB 2 (AI) | Data privacy, AI transparency |
| Washington | My Health My Data Act | Health data privacy |
| All 50 Legislatures | Various | Comprehensive state-level monitoring |

##### European Union

| Source | Type | Focus Area |
|--------|------|------------|
| European Parliament | Legislation tracker | EU AI Act, Data Act, CSRD, DORA |
| European Commission | Proposals + implementing acts | Digital Services Act, eIDAS 2.0, Cyber Resilience Act |
| Official Journal of the EU | Published legislation | Final legal texts, delegated acts, corrections |
| ESMA (European Securities and Markets Authority) | Technical standards | MiFID II, MiCA, sustainable finance |
| EBA (European Banking Authority) | Guidelines + standards | PSD2/PSD3, AML directives, DORA compliance |
| EIOPA (European Insurance Authority) | Guidelines | Solvency II, IORP II, insurance AI use |
| ENISA (EU Agency for Cybersecurity) | Standards + reports | NIS2, cybersecurity certification |
| EDPB (European Data Protection Board) | Guidelines + decisions | GDPR interpretation, cross-border enforcement |
| EFRAG (European Financial Reporting Advisory Group) | Standards | ESRS (European Sustainability Reporting Standards) |
| 27 Member State Regulators | National implementation | Member state transposition of EU directives |

##### E-Invoicing Mandates (Country-by-Country)

| Country | System | Status | Authority |
|---------|--------|--------|-----------|
| Italy | SDI / FatturaPA | Live (B2B + B2G mandatory) | Agenzia delle Entrate |
| France | PPF / Chorus Pro | B2B mandate Sep 2026 | DGFiP |
| Germany | XRechnung / Peppol | B2G live, B2B 2025+ | BZSt |
| Spain | SII / TicketBAI / VeriFactu | Live + expanding | AEAT |
| Poland | KSeF | Mandatory Feb 2026 | KAS |
| Romania | RO e-Factura / e-Transport | Live | ANAF |
| Belgium | Peppol B2B | Mandatory Jan 2026 | FPS Finance |
| Saudi Arabia | FATOORA | Phase 2 live | ZATCA |
| India | GST e-Invoice | Live (turnover thresholds) | GSTN |
| Brazil | NF-e / NFS-e | Live | Receita Federal |
| Mexico | CFDI 4.0 | Live | SAT |
| Malaysia | MyInvois | Mandatory Aug 2025+ | LHDN |
| Turkey | e-Fatura / e-Arsiv | Live | GIB |
| Egypt | e-Invoice | Live | ETA |
| Colombia | Electronic Invoice | Live | DIAN |
| Singapore | InvoiceNow (Peppol) | Voluntary, moving to mandatory | IMDA / IRAS |
| EU-wide | ViDA (VAT in Digital Age) | Adopted, phased 2028-2030 | European Commission |

##### SAF-T & Tax Reporting

| Source | Status | Authority |
|--------|--------|-----------|
| Portugal SAF-T | Live | AT (Tax Authority) |
| Norway SAF-T | Live | Skatteetaten |
| Lithuania SAF-T | Live | VMI |
| Poland JPK (SAF-T variant) | Live | KAS |
| Austria SAF-T | Planned | BMF |
| Luxembourg SAF-T | Implementation phase | ACD |
| Romania D406 (SAF-T) | Live | ANAF |
| OECD SAF-T Standard | Reference standard | OECD |
| OECD Pillar 1 (Profit reallocation) | Implementation phase | OECD |
| OECD Pillar 2 (Global minimum tax 15%) | Implementation phase | OECD |

##### United Kingdom

| Source | Type | Focus Area |
|--------|------|------------|
| UK Parliament | Legislation tracker | AI regulation, Online Safety Act, data reform |
| FCA (Financial Conduct Authority) | Rulemaking + enforcement | Financial services, crypto, consumer duty |
| ICO (Information Commissioner's Office) | Enforcement + guidance | UK GDPR, PECR, AI and data protection |
| HMRC (HM Revenue and Customs) | Tax guidance | Making Tax Digital, customs, e-invoicing |
| CMA (Competition and Markets Authority) | Market studies + enforcement | AI foundation models, digital markets |
| Ofcom (Office of Communications) | Regulatory guidance | Online Safety Act enforcement |
| Bank of England / PRA | Prudential regulation | Banking resilience, operational risk, AI in finance |

##### Asia-Pacific

| Country | Sources | Focus Areas |
|---------|---------|-------------|
| Japan | FSA (Financial Services Agency), METI (Ministry of Economy), NTA (National Tax Agency) | AI governance, data protection (APPI), tax compliance |
| South Korea | PIPC (Personal Information Protection Commission), FSC (Financial Services Commission), NTS (National Tax Service) | Privacy (PIPA), AI regulation, fintech, tax |
| Singapore | MAS (Monetary Authority), PDPC (Personal Data Protection Commission), IRAS (Inland Revenue) | AI governance (FEAT principles), fintech, data privacy, tax |
| Australia | OAIC (Office of the Australian Information Commissioner), ASIC (Australian Securities and Investments Commission), ATO (Australian Taxation Office) | Privacy Act reform, AI ethics framework, tax |
| India | MeitY (Ministry of Electronics and IT), SEBI (Securities and Exchange Board), RBI (Reserve Bank), GSTN | DPDP Act, AI regulation, financial services, GST e-invoicing |
| China | CAC (Cyberspace Administration), SAMR (State Administration for Market Regulation) | AI regulation, algorithmic governance, data security law |
| Hong Kong | SFC (Securities and Futures Commission), PCPD (Privacy Commissioner) | Fintech, data privacy, AI governance |

##### Americas

| Country | Sources | Focus Areas |
|---------|---------|-------------|
| Canada | OSFI (Office of the Superintendent of Financial Institutions), OPC (Office of the Privacy Commissioner), CRA (Canada Revenue Agency) | AIDA (AI and Data Act), PIPEDA/CPPA, financial regulation, tax |
| Brazil | ANPD (National Data Protection Authority), CVM (Securities Commission), Receita Federal | LGPD, AI regulation, financial services, NF-e/NFS-e |
| Mexico | INAI (National Institute for Transparency), CNBV (National Banking and Securities Commission), SAT (Tax Administration) | Data protection, fintech law, CFDI 4.0 |

##### Middle East & Africa

| Country / Region | Sources | Focus Areas |
|------------------|---------|-------------|
| UAE | ADGM (Abu Dhabi Global Market), DFSA (Dubai Financial Services Authority), FTA (Federal Tax Authority) | AI framework, data protection, VAT |
| Saudi Arabia | ZATCA (Zakat, Tax and Customs Authority), SAMA (Saudi Arabian Monetary Authority), SDAIA (Saudi Data & AI Authority) | FATOORA e-invoicing, AI governance, fintech |
| South Africa | SARS (South African Revenue Service), Information Regulator | POPIA (data protection), tax compliance |
| Nigeria | NITDA (National Information Technology Development Agency), FIRS (Federal Inland Revenue Service) | NDPR (data protection), AI strategy, tax |
| Kenya | ODPC (Office of the Data Protection Commissioner), KRA (Kenya Revenue Authority) | Data protection, tax digitization |

##### International Standards Organizations

| Organization | Focus Area |
|-------------|------------|
| OECD | AI principles, BEPS, SAF-T standard, Pillar 1 & 2, privacy guidelines |
| ISO | 27001 (security), 42001 (AI management), 14001 (environment), 37001 (anti-bribery) |
| NIST | AI RMF, Cybersecurity Framework, Privacy Framework, SP 800-series |
| FATF (Financial Action Task Force) | AML/CFT standards, mutual evaluations, guidance on virtual assets |
| Basel Committee | Bank capital requirements, operational resilience, climate risk |
| ISSB / IFRS Foundation | IFRS S1 & S2 sustainability disclosure standards |
| GRI (Global Reporting Initiative) | Sustainability reporting standards |
| Peppol | E-invoicing and e-procurement interoperability |
| OASIS / UN-CEFACT | E-business and electronic document standards |

**Total:** 400+ sources across 50+ jurisdictions

#### ERP Impact Analysis

For each regulation identified by the intelligence engine, agents perform an **ERP Impact Analysis**:

1. **Detection** — Agent identifies a new regulation or amendment
2. **Company Mapping** — Determines which company profiles are affected (by industry, jurisdiction, size)
3. **ERP Check** — Analyzes whether the company's ERP system (SAP, Oracle, NetSuite, Dynamics 365, Infor, etc.) handles the regulation natively or requires configuration
4. **Gap Analysis** — If the ERP does not handle it natively, identifies the gap
5. **Solution Recommendation** — Recommends third-party compliance tools from the vendor database, with cost/benefit comparison
6. **Action Plan** — Generates a prioritized action plan with deadlines

Example output:
> *"Poland's KSeF e-invoicing mandate (Feb 2026) requires SAF-T compliant XML invoices submitted to the national system. Your ERP (SAP S/4HANA) supports KSeF via SAP Document Compliance add-on (included in license). Action: Enable KSeF integration in SAP DRC. No third-party tool needed. Estimated setup: 2-4 weeks."*

---

### Pillar 2: Content & Blog Engine (Marketing Machine)

The autonomous content pipeline that drives organic traffic and establishes domain authority across all compliance areas.

#### Pipeline Architecture (Unchanged)

Same 5-stage pipeline used today:

1. **Research Agent** — Scans RSS feeds, regulatory sources, and news across all compliance domains
2. **Planner Agent** — Analyzes content gaps and plans articles across domains using self-balancing logic
3. **Writer Agent** — Produces SEO-optimized compliance content with regulatory accuracy
4. **QA Agent** — Scores content across 8 quality dimensions, rejects below threshold
5. **Publisher Agent** — Publishes approved content, generates metadata, schedules distribution

#### Expanded Content Domains

| Domain | Example Topics | SEO Value |
|--------|---------------|-----------|
| AI Governance | EU AI Act compliance, high-risk AI classification, AI risk management frameworks | High — growing search volume, low competition |
| E-Invoicing | KSeF Poland guide, CFDI 4.0 migration, Peppol adoption, ViDA timeline | Very High — urgent compliance deadlines, underserved niche |
| SAF-T & Tax Reporting | SAF-T implementation guides, OECD Pillar 2, digital tax reporting | High — technical audience with high intent |
| SOC 2 / Cybersecurity | SOC 2 readiness, NIS2 compliance, ISO 27001 certification | Very High — massive search volume, strong affiliate potential |
| Data Privacy | GDPR compliance, CCPA/CPRA, DPDP Act, cross-border transfers | Very High — evergreen demand |
| ESG / Sustainability | CSRD reporting, double materiality, Scope 3 emissions, EU Taxonomy | High — emerging market, low competition |
| Fintech / AML | MiCA compliance, AML program design, KYC automation, PSD3 | High — high-value audience |
| HR / Employment Law | Pay transparency, AI hiring bias audits, remote work compliance | High — universal relevance |

#### Production Targets

- **Daily output:** 4-6 articles across domains
- **Budget:** $10-15/day (DeepSeek API)
- **Distribution schedule:** Rotate across domains to maintain balanced coverage
- **Blog page:** Domain filter tabs so readers can focus on their area of interest
- **Amplification:** Each article generates social media drafts (LinkedIn, X) and email newsletter content

---

### Pillar 3: Vendor Lifecycle Management

End-to-end vendor compliance automation — from initial discovery through continuous monitoring and board-level reporting.

#### Stage 1: Discovery

AI agents continuously scan for compliance vendors across all domains:
- Monitor funding announcements (Crunchbase, TechCrunch, press releases)
- Track product launches and feature updates
- Identify emerging vendors in new compliance categories
- Maintain vendor profiles with funding, headcount, product capabilities, and certifications

#### Stage 2: Onboarding

Vendor self-service portal for structured onboarding:
- Vendor self-registration with company profile
- AI-generated questionnaires customized by industry, jurisdiction, and risk level
- Standard framework support: SIG Lite, CAIQ (Cloud Security Alliance), VSAQ (Vendor Security Assessment Questionnaire)
- Automated document collection (SOC 2 reports, ISO certificates, privacy policies, insurance certificates)

#### Stage 3: Due Diligence

AI agents perform automated vendor assessments:
- **Security posture scan** — SSL configuration, security headers, vulnerability disclosure program
- **Privacy policy analysis** — AI extraction of data handling practices, sub-processors, breach notification terms
- **SOC 2 report extraction** — Automated parsing of Type II reports for exceptions and control gaps
- **Financial health check** — Revenue signals, funding runway, customer concentration risk
- **Regulatory compliance verification** — Cross-reference vendor claims against actual certifications
- **Risk scoring** — Composite score across security, privacy, financial, operational, and compliance dimensions

#### Stage 4: Continuous Monitoring

Ongoing automated surveillance for all onboarded vendors:
- **Breach alerts** — Immediate notification if a vendor appears in breach databases or news
- **Certification expirations** — Track SOC 2, ISO 27001, and other cert renewal dates
- **Enforcement actions** — Monitor regulatory enforcement databases for vendor mentions
- **Financial distress signals** — Layoff announcements, funding concerns, leadership changes
- **Product changes** — Track vendor product updates that affect compliance posture
- **Sentiment monitoring** — Customer review trends on G2, Gartner Peer Insights, Reddit

#### Stage 5: Reporting

Auto-generated compliance documentation for stakeholders:
- **Board-ready reports** — Executive summaries with risk trends and key metrics
- **Vendor risk heat maps** — Visual dashboards showing risk concentration across vendors
- **Audit evidence packages** — Pre-packaged documentation for SOC 2, ISO 27001, and regulatory audits
- **HQ briefing documents** — Concise summaries for management review and decision-making

#### Vendor Database Expansion

| Domain | Count | Example Vendors |
|--------|-------|----------------|
| AI Governance | 88 (existing) | Holistic AI, Credo AI, ValidMind, Monitaur, Fiddler |
| E-Invoicing / EDI | 60+ | Sovos, Avalara, Pagero, Comarch, Tungsten, TrustWeaver |
| Tax Compliance | 50+ | Thomson Reuters ONESOURCE, Vertex, Avalara, Wolters Kluwer CCH |
| SAF-T / Reporting | 30+ | Seeburger, SNI, TrustWeaver, Fonoa, Sovos |
| ERP with Compliance Modules | 20+ | SAP, Oracle, NetSuite, Microsoft Dynamics 365, Infor, Workday |
| Privacy / GDPR | 40+ | OneTrust, TrustArc, BigID, Securiti, DataGrail, Transcend |
| Cybersecurity / SOC 2 | 50+ | Vanta, Drata, Secureframe, Sprinto, Thoropass, Wiz, CrowdStrike |
| ESG / Sustainability | 35+ | Watershed, Persefoni, Workiva, EcoVadis, Sphera, Diligent |
| Fintech / AML | 40+ | Chainalysis, ComplyAdvantage, Sumsub, Jumio, Unit21, NICE Actimize |
| HR / Employment Law | 35+ | Deel, Remote, Rippling, Syndio, Papaya Global, Gusto |
| **Total** | **450+** | |

---

## 4. Autonomous Agent Architecture

### Current Pipeline (Stays)

```
Research Agent → Planner Agent → Writer Agent → QA Agent → Publisher Agent
```

- Runs hourly via cron-job.org
- Fire-and-forget pattern (responds 202 immediately to avoid 30s cron timeout)
- DeepSeek chat model for generation, DeepSeek Reasoner for complex analysis
- QA scoring across 8 dimensions with minimum threshold for publication
- Budget controls prevent runaway spend

### Enhanced Autonomy Features

#### 1. Multi-Domain Research

Agents analyze sources across all compliance domains simultaneously. The Research Agent pulls from 400+ sources and tags each piece of intelligence by domain, jurisdiction, and urgency.

#### 2. Self-Balancing Planner

The Planner Agent auto-detects content gaps and prioritizes underrepresented domains. If AI governance has 200 articles but e-invoicing has 10, the planner automatically skews toward e-invoicing until balance is achieved.

#### 3. Domain-Specialized Prompts

Each compliance domain has specific research context injected into the agent prompts:
- AI Governance: EU AI Act articles, risk classification tiers, conformity assessment procedures
- E-Invoicing: Country-specific schema requirements, Peppol BIS specifications, clearance model details
- Tax: OECD Pillar 2 rules, SAF-T schema structure, jurisdictional filing deadlines
- Cybersecurity: SOC 2 Trust Service Criteria, ISO 27001 Annex A controls, NIST CSF categories
- Privacy: GDPR articles and recitals, CCPA sections, cross-border transfer mechanisms
- ESG: ESRS standards, GHG Protocol scopes, EU Taxonomy technical screening criteria
- Fintech: MiCA classification rules, FATF recommendations, PSD2/PSD3 requirements
- HR: Pay transparency law specifics by jurisdiction, AI hiring audit requirements

#### 4. Expanded REGULATORY_FACT_SHEET

Verified facts across all domains prevent hallucination. The fact sheet is the single source of truth for dates, thresholds, penalties, and regulatory requirements. Every article is checked against it during QA.

#### 5. Deep Research Mode

Uses DeepSeek Reasoner (chain-of-thought) for complex regulatory analysis that requires multi-step reasoning — such as determining whether a specific company configuration falls under an e-invoicing mandate based on revenue, jurisdiction, and transaction type.

### Future Agent Capabilities (Phase 1+)

- **Tool-using agents** via DeepSeek function calling — agents can invoke external tools and APIs
- **Direct regulatory API integration** — Federal Register API, EUR-Lex API, Congress.gov API for real-time legislation tracking
- **Web search** for real-time regulation updates and breaking enforcement actions
- **Automated vendor due diligence scans** — agents autonomously assess vendor security posture and compliance claims
- **ERP compatibility API queries** — agents check ERP vendor documentation and release notes for native regulation support

---

## 5. New Database Models

The following Prisma models are added to support the expanded platform. These are additive and do not modify existing models.

```prisma
model CompanyProfile {
  id                String   @id @default(cuid())
  name              String
  industry          String
  size              String   // "1-50", "51-500", "501-5000", "5000+"
  revenue           String?  // Revenue range
  headquarters      String
  operatingCountries String[]
  erpSystem         String?  // "SAP", "Oracle", "NetSuite", etc.
  aiTools           String[] // AI tools in use
  complianceDomains String[] // Domains they care about
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model RegulatoryAlert {
  id               String   @id @default(cuid())
  regulation       String
  jurisdiction     String
  regulatoryBody   String
  changeType       String   // "NEW", "AMENDMENT", "DEADLINE", "ENFORCEMENT"
  urgency          String   // "CRITICAL", "HIGH", "MEDIUM", "LOW"
  title            String
  summary          String   @db.Text
  erpImpact        String?  @db.Text
  actionRequired   String?  @db.Text
  deadline         DateTime?
  sourceUrl        String?
  createdAt        DateTime @default(now())
}

model VendorAssessment {
  id              String   @id @default(cuid())
  vendorId        String
  assessmentType  String   // "INITIAL", "PERIODIC", "TRIGGERED"
  riskScore       Float?
  dimensions      Json?    // Scoring breakdown
  findings        String?  @db.Text
  recommendation  String?  @db.Text
  status          String   // "IN_PROGRESS", "COMPLETE", "EXPIRED"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VendorOnboarding {
  id                String   @id @default(cuid())
  vendorId          String
  stage             String   // "INVITED", "QUESTIONNAIRE_SENT", "DOCS_RECEIVED", "UNDER_REVIEW", "APPROVED", "REJECTED"
  documentsReceived Json?
  questionnaireData Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 6. Revenue Model

### Subscription Tiers

| Tier | Price | What They Get |
|------|-------|--------------|
| Free | $0 | Blog content, basic regulation tracker (1 jurisdiction), vendor directory |
| Starter | $99/mo | 3 jurisdictions, regulatory alerts, basic vendor due diligence (5/mo) |
| Professional | $499/mo | 10 jurisdictions, ERP impact analysis, vendor assessments (25/mo), document generation |
| Enterprise | $2,000+/mo | Unlimited jurisdictions, full vendor lifecycle, API access, SSO, custom reports |
| Vendor Assessment (one-time) | $199-499 | One-off vendor due diligence report |

### Monthly Cost Estimate

| Cost | Amount |
|------|--------|
| Railway hosting | $5-20 |
| DeepSeek API (expanded pipeline) | $100-200 |
| Domain + DNS | $1 |
| Stripe fees | Variable |
| **Total** | **~$300/mo** |

---

## 7. Phased Execution Timeline

| Phase | Domain | When | What |
|-------|--------|------|------|
| 0 | AI Governance + Content Expansion (CURRENT) | Now | Expand pipeline to all domains, add 80+ sources |
| 0.5 | Blog Domain Filters + E-Invoicing Content | Month 1 | Domain filter tabs on blog page, e-invoicing/tax focused content |
| 1 | Regulatory Intelligence MVP | Month 2-3 | Company onboarding, regulation mapping, alerts for US + EU |
| 2 | Vendor Lifecycle v1 | Month 3-4 | Vendor onboarding portal, AI-driven due diligence |
| 3 | ERP Impact Analysis | Month 4-5 | ERP-specific recommendations per regulation |
| 4 | Multi-Jurisdiction Expansion | Month 5-6 | 20+ jurisdictions, APAC, MENA, LATAM coverage |
| 5 | Full Platform + Rebrand | Month 6+ | ComplianceHub rebrand, enterprise features, API |

---

## 8. Technical Implementation (Shared Across Phases)

### Phase 0 Changes (Current Sprint)

- Expand agent prompts to cover all compliance domains
- Expand REGULATORY_FACT_SHEET with verified facts across all domains
- Add 80+ new RSS sources across all compliance domains
- Add domain filter tabs to blog page
- Expand VendorCategory enum for new domains
- Increase `dailyArticleTarget` from 2 to 4
- Increase `budgetLimitUsd` from $5 to $12

### Database Changes

- **VendorCategory enum:** Add 18 new categories:

  ```text
  // Privacy
  CONSENT_MANAGEMENT, PRIVACY_MANAGEMENT, DSAR_AUTOMATION, DATA_GOVERNANCE

  // Cybersecurity
  COMPLIANCE_AUTOMATION, CLOUD_SECURITY, APPLICATION_SECURITY, ENDPOINT_SECURITY, SECURITY_AWARENESS

  // ESG
  ESG_REPORTING, CARBON_MANAGEMENT, ESG_RATINGS, SUSTAINABILITY_MANAGEMENT

  // Fintech
  AML_KYC, CRYPTO_COMPLIANCE, TRANSACTION_MONITORING, REGTECH

  // E-Invoicing & Tax
  E_INVOICING, TAX_COMPLIANCE
  ```

- **ContentPage.category:** Used for domain filtering (already exists as optional string)
- **AgentSource.category:** Used for domain tagging (already exists as string)
- **Future models:** CompanyProfile, RegulatoryAlert, VendorAssessment, VendorOnboarding (see Section 5)

### Pipeline Architecture (No Changes Required)

- Same 5-stage pipeline
- Same DeepSeek models (chat + reasoner)
- Same QA scoring (8 dimensions)
- Same budget controls
- Same fire-and-forget cron pattern

### Compliance Checker Pattern (For Future Tools)

Each new compliance checker follows the same architecture as the existing AI Act Compliance Checker:

```text
src/lib/constants/{framework}-data.ts       -- Static rules, obligations, assessment criteria
src/lib/ai/{framework}-engine.ts            -- AI assessment logic and scoring
src/lib/validators/{framework}.ts           -- Input validation schemas (Zod)
src/app/(tools)/{tool-name}/wizard/         -- Multi-step wizard UI pages
src/app/api/ai/{tool-name}/route.ts         -- API endpoint for AI assessment
```

---

## 9. Notes

- Each phase is independent — skip or reorder based on market signals
- All phases use the same Stripe products/subscriptions — just add more value to existing tiers
- Domain purchase: secure ComplianceHub.io or similar early
- Each expansion increases value proposition for existing subscribers (reduces churn)
- Agent pipeline runs autonomously — no human intervention needed for content generation
- Future: tool-using agents via DeepSeek function calling for real-time regulatory monitoring
