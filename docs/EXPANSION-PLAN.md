# AIGovHub Expansion Plan

## Overview

Expand AIGovHub from an AI governance-only platform into a comprehensive compliance hub covering 4 additional domains. Each phase adds a new compliance area using the existing architecture — same codebase, database, pipeline, and subscription model.

**Target rebrand:** ComplianceHub.io or GovComplianceHub.io (once 3+ areas are live)

---

## Current State (Phase 0 — Live)

- **Domain:** AI Governance & EU AI Act Compliance
- **Content:** Auto-published via DeepSeek agent pipeline (hourly)
- **Tools:** AI Act Compliance Checker, Vendor Risk Questionnaire Generator
- **Vendors:** 88 AI governance vendors tracked
- **Revenue:** Subscriptions ($19-99/mo), one-time toolkits ($49-499), affiliate (future)
- **Cost:** ~$1/day DeepSeek, ~$5/mo Railway, ~$12/yr domain

---

## Phase 1: Data Privacy Compliance (Month 2)

### Why First
- Closest overlap with AI governance users (same compliance officers)
- GDPR affects every company with EU customers
- 140+ countries now have privacy laws — massive content surface
- High search volume keywords

### Agent Sources to Add
- IAPP (International Association of Privacy Professionals) RSS
- EDPB (European Data Protection Board) news feed
- ICO (UK Information Commissioner) enforcement actions
- CNIL (France), BfDI (Germany) regulatory updates
- Privacy-focused blogs: PrivacyMatters, DataGuidance, OneTrust blog
- State privacy law trackers (CCPA, CPRA, Virginia CDPA, Colorado CPA, etc.)

### New Content Topics
- GDPR compliance checklists and guides
- Data Protection Impact Assessments (DPIA)
- Cross-border data transfer rules (SCCs, adequacy decisions)
- Cookie consent and tracking compliance
- Data Subject Access Request (DSAR) handling
- Privacy by Design implementation
- US state privacy law comparisons
- Data breach notification requirements by jurisdiction

### New Tool: GDPR Readiness Checker
- Wizard-style assessment (similar to AI Act Checker)
- Questions about data processing activities, legal bases, DPO status
- Maps to specific GDPR articles and obligations
- Outputs compliance score and gap analysis
- Reference file: `src/lib/constants/ai-act-data.ts` (clone and adapt)

### New Tool: DPIA Generator
- Input: processing activity details, data types, risks
- AI generates a structured Data Protection Impact Assessment
- Maps to GDPR Article 35 requirements
- Reference file: `src/lib/ai/questionnaire-engine.ts` (similar pattern)

### Vendors to Add (Privacy-Focused)
- OneTrust, TrustArc, BigID, Securiti, WireWheel
- Didomi, Cookiebot, Osano (consent management)
- DataGrail, Transcend, Ethyca (DSR automation)
- Collibra, Alation (data governance/catalog)
- ~30-40 vendors, same JSON format as existing vendors

### Implementation Steps
1. Add new RSS sources to `agent_sources` table via admin or seed script
2. Update agent prompts to include privacy/GDPR topics in content planning
3. Create `src/lib/constants/gdpr-data.ts` with GDPR articles, obligations, assessment criteria
4. Create `src/app/(tools)/gdpr-checker/` wizard pages (clone AI Act checker structure)
5. Create `src/lib/ai/dpia-engine.ts` for DPIA generation
6. Add DPIA generator pages under `src/app/(tools)/dpia-generator/`
7. Prepare vendor JSON file and bulk import via `/api/vendors/bulk`
8. Add "Privacy" category to vendor tracker filters
9. Update navigation to include new tools
10. Update pricing page to highlight privacy tools

### Estimated Work: 2-3 days

---

## Phase 2: Cybersecurity Compliance (Month 3)

### Why Second
- Largest market ($15B+ compliance tools market)
- Highest affiliate commissions (Vanta, Drata pay 20-30% recurring)
- Every company needs cybersecurity compliance
- SOC 2 is the most searched compliance framework

### Agent Sources to Add
- NIST Cybersecurity Framework updates
- CISA advisories and guidance
- SOC 2 / AICPA updates
- ISO 27001 news and certification updates
- CIS Benchmarks updates
- Krebs on Security, Dark Reading, The Record (news)
- SecurityWeek, BleepingComputer (breach/vulnerability news)

### New Content Topics
- SOC 2 Type I vs Type II compliance guides
- ISO 27001 certification roadmap
- NIST CSF implementation guides
- PCI-DSS compliance for SaaS companies
- HIPAA security requirements for healthtech
- Zero trust architecture compliance
- Penetration testing requirements by framework
- Incident response plan templates and guides
- Cloud security compliance (AWS, Azure, GCP)

### New Tool: SOC 2 Readiness Checker
- Assessment wizard covering Trust Service Criteria
- Security, Availability, Processing Integrity, Confidentiality, Privacy
- Maps controls to specific SOC 2 requirements
- Outputs readiness score and remediation checklist

### New Tool: Security Vendor Questionnaire
- Input: vendor type, data handling, infrastructure
- AI generates security-focused due diligence questionnaire
- Covers access control, encryption, incident response, business continuity
- Maps to SOC 2, ISO 27001, NIST frameworks

### Vendors to Add (Cybersecurity Compliance)
- Vanta, Drata, Secureframe, Sprinto, Thoropass (compliance automation)
- Wiz, Orca Security, Lacework (cloud security)
- CrowdStrike, SentinelOne, Palo Alto (endpoint/network)
- Snyk, Veracode, Checkmarx (application security)
- KnowBe4, Proofpoint (security awareness)
- ~40-50 vendors

### Affiliate Program Targets (High Commission)
| Vendor | Commission | Type |
|--------|-----------|------|
| Vanta | 20% recurring | PartnerStack |
| Drata | 20% recurring | PartnerStack |
| Secureframe | 15-20% recurring | Direct |
| Sprinto | 20% recurring | Direct |
| KnowBe4 | $50-200/lead | Direct |

### Estimated Work: 3-4 days

---

## Phase 3: ESG & Sustainability Reporting (Month 4)

### Why Third
- Brand new market — EU CSRD just took effect (50,000+ companies affected)
- Very few competitors in the compliance tool space for ESG
- High-value enterprise customers
- Regulation is complex and companies are scrambling

### Agent Sources to Add
- EFRAG (European Financial Reporting Advisory Group) ESRS standards
- SEC climate disclosure rule updates
- ISSB (International Sustainability Standards Board) news
- GRI (Global Reporting Initiative) updates
- CDP (Carbon Disclosure Project) guidance
- ESG Today, Responsible Investor, GreenBiz news feeds

### New Content Topics
- CSRD compliance roadmap and timeline
- European Sustainability Reporting Standards (ESRS) guides
- Double materiality assessment guides
- SEC climate disclosure requirements
- Scope 1, 2, 3 emissions reporting
- EU Taxonomy alignment assessment
- Greenwashing risks and enforcement actions
- ESG data management best practices
- Supply chain sustainability due diligence (CSDDD)

### New Tool: CSRD Readiness Checker
- Assessment of reporting readiness across ESRS topics
- Environment, Social, Governance dimensions
- Maps to specific ESRS disclosure requirements
- Outputs readiness score and priority action items

### New Tool: Materiality Assessment Generator
- Input: industry, size, geography, stakeholder concerns
- AI generates double materiality assessment framework
- Identifies material ESG topics for reporting
- Maps to GRI, ESRS, and ISSB standards

### Vendors to Add (ESG/Sustainability)
- Watershed, Persefoni, Sphera (carbon/climate)
- Workiva, Wolters Kluwer (ESG reporting)
- EcoVadis, Sustainalytics (ESG ratings)
- Diligent, Novisto, Position Green (ESG management)
- ~25-35 vendors

### Estimated Work: 3-4 days

---

## Phase 4: Fintech & Financial Compliance (Month 5-6)

### Why Fourth
- High-value niche — fintech companies pay premium
- Complex regulatory landscape (AML, KYC, MiCA, PSD2)
- Crypto regulation is rapidly evolving
- Higher subscription prices justified ($99-299/mo)

### Agent Sources to Add
- EBA (European Banking Authority) guidelines
- FinCEN (US Financial Crimes Enforcement) updates
- FCA (UK Financial Conduct Authority) news
- MiCA (Markets in Crypto-Assets) regulation updates
- FATF (Financial Action Task Force) guidance
- Finextra, PaymentsJournal, CoinDesk regulation news

### New Content Topics
- AML/KYC compliance program guides
- MiCA crypto regulation compliance roadmap
- PSD2/PSD3 open banking compliance
- Transaction monitoring requirements
- Sanctions screening best practices
- RegTech vendor evaluations
- Digital asset custody compliance
- Payment processor compliance requirements

### New Tool: AML Risk Assessment
- Assessment of AML program maturity
- Customer Due Diligence (CDD) evaluation
- Transaction monitoring coverage analysis
- Maps to FATF recommendations and local regulations

### Vendors to Add (Fintech Compliance)
- Chainalysis, Elliptic (crypto compliance)
- ComplyAdvantage, Sumsub, Jumio (KYC/AML)
- Alloy, Unit21, Sardine (fraud/risk)
- Tookitaki, Napier AI, NICE Actimize (transaction monitoring)
- ~30-40 vendors

### Estimated Work: 4-5 days

---

## Technical Implementation (Shared Across All Phases)

### Database Changes
No schema changes needed — the existing models support all expansion:
- `ContentPage.type` — already supports multiple content types
- `AgentSource` — add new RSS feeds per domain
- `Vendor.category` — add new vendor categories to the enum
- `EvidenceCard` — stores research for any topic
- Agent prompts already support multiple content types

### Prisma Schema Update (When Adding Vendor Categories)
Add new categories to the `VendorCategory` enum in `prisma/schema.prisma`:
```
enum VendorCategory {
  // Existing AI governance categories...

  // Privacy (Phase 1)
  CONSENT_MANAGEMENT
  PRIVACY_MANAGEMENT
  DSAR_AUTOMATION
  DATA_GOVERNANCE

  // Cybersecurity (Phase 2)
  COMPLIANCE_AUTOMATION
  CLOUD_SECURITY
  APPLICATION_SECURITY
  ENDPOINT_SECURITY
  SECURITY_AWARENESS

  // ESG (Phase 3)
  ESG_REPORTING
  CARBON_MANAGEMENT
  ESG_RATINGS
  SUSTAINABILITY_MANAGEMENT

  // Fintech (Phase 4)
  AML_KYC
  CRYPTO_COMPLIANCE
  TRANSACTION_MONITORING
  REGTECH
}
```

### Navigation Updates
Update `src/lib/constants/navigation.ts` to add new tool links as each phase launches.

### Agent Source Seeding
For each phase, create a seed script or use admin UI to add 10-15 RSS/web sources:
```typescript
// Example: scripts/seed-privacy-sources.ts
const privacySources = [
  { name: "IAPP News", url: "https://iapp.org/news/rss/", type: "RSS", category: "privacy" },
  { name: "EDPB News", url: "https://edpb.europa.eu/rss_en", type: "RSS", category: "privacy" },
  // ...
];
```

### Agent Prompt Updates
The planner prompt in `src/lib/agents/prompts.ts` may need updating to understand new domains. Add domain context so the AI knows about GDPR, SOC 2, CSRD frameworks.

### Compliance Checker Pattern
Each new checker follows the same architecture:
```
src/lib/constants/{framework}-data.ts    — Static rules/obligations
src/lib/ai/{framework}-engine.ts         — AI assessment logic
src/lib/validators/{framework}.ts        — Input validation
src/app/(tools)/{tool-name}/wizard/      — Multi-step wizard UI
src/app/api/ai/{tool-name}/route.ts      — API endpoint
```

---

## Revenue Projection

### Conservative Estimates (Per Month, After 6 Months)

| Source | Monthly Revenue |
|--------|----------------|
| Subscriptions (50 users avg $49) | $2,450 |
| Toolkit sales (10/month avg $150) | $1,500 |
| Affiliate commissions (20 referrals) | $400-800 |
| **Total** | **$4,350-4,750/mo** |

### Monthly Costs

| Cost | Amount |
|------|--------|
| Railway hosting | $5-20 |
| DeepSeek API | $30-40 |
| Domain + DNS | $1 |
| Stripe fees (2.9% + 30c) | ~$140 |
| **Total** | **~$200/mo** |

### Net Profit: ~$4,150-4,550/mo

---

## Timeline Summary

| Phase | Domain | When | Work |
|-------|--------|------|------|
| 0 | AI Governance (LIVE) | Now | Done |
| 1 | Data Privacy (GDPR/CCPA) | Week 6-8 | 2-3 days |
| 2 | Cybersecurity (SOC 2/ISO) | Week 10-12 | 3-4 days |
| 3 | ESG/Sustainability (CSRD) | Week 14-16 | 3-4 days |
| 4 | Fintech (AML/KYC/MiCA) | Week 18-22 | 4-5 days |
| Rebrand | ComplianceHub.io | Week 20+ | 1 day |

---

## Pre-Expansion Checklist (Do Before Phase 1)

- [ ] AIGovHub has 500+ published articles
- [ ] Google is indexing and showing pages in search results
- [ ] At least 100 organic visitors/week
- [ ] At least 1 paying subscriber (proof of concept)
- [ ] Agent pipeline running reliably for 4+ weeks
- [ ] Signed up for 2-3 affiliate programs

---

## Notes

- Each phase is independent — skip or reorder based on market signals
- All phases use the same Stripe products/subscriptions — just add more value to existing tiers
- Consider adding a "Compliance News" section that aggregates all domains
- Domain purchase: secure ComplianceHub.io or similar early before building
- Each expansion increases the value proposition for existing subscribers (reduces churn)
