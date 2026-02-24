# AIGovHub — Regulatory Compliance Intelligence Platform

**Website:** [www.aigovhub.io](https://www.aigovhub.io)

AIGovHub is an AI-powered platform that helps businesses stay on top of regulatory compliance across multiple domains. Think of it as a **Bloomberg terminal for compliance** — it monitors regulations worldwide, assesses vendor risk, analyzes ERP gaps, and publishes expert compliance content, all autonomously.

---

## What Problem Does This Solve?

Businesses today face an overwhelming number of regulations — from AI governance laws (EU AI Act) to e-invoicing mandates (Poland's KSeF), cybersecurity standards (NIS2, SOC 2), data privacy rules (GDPR, CCPA), and ESG reporting requirements (CSRD). Each country has its own rules, deadlines, and penalties.

Most organizations rely on expensive consultants or manual tracking to stay compliant. AIGovHub automates this by:

- **Monitoring 130+ regulatory sources** across 47 countries
- **Alerting companies** when a regulation affects them specifically
- **Assessing vendor risk** using AI-driven due diligence
- **Analyzing ERP systems** to identify compliance gaps
- **Publishing daily compliance intelligence** so teams stay informed without reading 100-page legal documents

---

## Platform Features

### 1. Compliance Blog & Intelligence Feed

The platform runs an **autonomous content pipeline** that publishes 4-6 compliance articles daily across 8 domains:

| Domain | What It Covers |
|--------|---------------|
| **AI Governance** | EU AI Act, risk classification, conformity assessments, AI ethics frameworks |
| **E-Invoicing & Tax** | Country-specific mandates (KSeF, CFDI, SDI, Peppol), SAF-T reporting, ViDA |
| **Cybersecurity** | SOC 2, ISO 27001, NIS2, NIST frameworks, incident response |
| **Data Privacy** | GDPR, CCPA/CPRA, LGPD, cross-border data transfers, DPAs |
| **ESG & Sustainability** | CSRD reporting, carbon accounting, EU Taxonomy, double materiality |
| **Fintech & AML** | MiCA, anti-money laundering, KYC automation, PSD2/PSD3 |
| **HR & Employment** | Pay transparency, AI hiring bias audits, remote work compliance |
| **Tax Compliance** | OECD Pillar 2, global minimum tax, digital tax reporting |

**How it works:** AI agents scan RSS feeds and regulatory sources every hour, identify newsworthy developments, write SEO-optimized articles, run quality checks (scoring across 8 dimensions), and publish automatically. No human intervention needed.

**URL:** [www.aigovhub.io/blog](https://www.aigovhub.io/blog)

---

### 2. Regulatory Jurisdiction Tracker

A living map of **47 jurisdictions** with their active regulations, upcoming deadlines, and enforcement actions. Users can see at a glance which countries have new rules coming and what industries are affected.

**Example:** A company operating in Poland, Germany, and Saudi Arabia can instantly see:
- Poland's KSeF e-invoicing mandate (deadline, requirements, penalties)
- Germany's XRechnung B2B rules (timeline, XML schema)
- Saudi Arabia's FATOORA Phase 2 requirements (ZATCA integration)

**URL:** [www.aigovhub.io/jurisdictions](https://www.aigovhub.io/jurisdictions)

---

### 3. Company Profile & Onboarding

Subscribers create a **Company Profile** that tells the platform about their business:

- **Industry** (financial services, healthcare, technology, manufacturing, etc.)
- **Company size** (1-50, 51-250, 251-1,000, 1,001-5,000, 5,000+)
- **Headquarters & operating countries** (select all countries where you do business)
- **ERP system** (SAP, Oracle, NetSuite, Dynamics 365, etc.)
- **Compliance domains of interest** (select which areas matter to your business)

The platform uses this profile to **personalize everything** — regulatory alerts, vendor recommendations, and ERP gap analysis are all tailored to your specific situation.

**URL:** [www.aigovhub.io/dashboard/company](https://www.aigovhub.io/dashboard/company) (requires login)

---

### 4. Regulatory Alerts

Once a company profile is set up, the platform automatically matches new regulatory developments to your business. Alerts are classified by:

- **Urgency:** Critical, High, Medium, Low
- **Type:** New regulation, Amendment, Deadline approaching, Enforcement action
- **Domain:** AI governance, e-invoicing, cybersecurity, privacy, ESG, fintech, HR, tax

**How it works:** An alert pipeline runs every 4 hours. AI agents scan recently collected evidence (news, regulatory updates, policy changes), determine if they represent a regulatory change, extract structured data (regulation name, jurisdiction, urgency, affected industries), and match them to company profiles based on country, industry, and compliance domains.

**Example alert:** *"CRITICAL: Poland KSeF e-invoicing mandate takes effect February 2026. Your company operates in Poland. Action required: Ensure your ERP system supports SAF-T XML invoice submission to the national KSeF system."*

**URL:** [www.aigovhub.io/dashboard/alerts](https://www.aigovhub.io/dashboard/alerts) (requires Starter+ subscription)

---

### 5. Vendor Tracker & Due Diligence

A database of **137 compliance vendors** across 27 categories, covering:

| Category | Examples |
|----------|---------|
| GRC Platforms | ServiceNow, Diligent, LogicGate, Archer |
| AI Governance | Holistic AI, Credo AI, ValidMind, Monitaur |
| Cybersecurity | CrowdStrike, Palo Alto, Wiz, Snyk, Vanta |
| Data Privacy | OneTrust, BigID, Transcend, Securiti |
| E-Invoicing & Tax | Sovos, Avalara, Pagero, Comarch, Vertex |
| ESG & Sustainability | Workiva, Persefoni, Watershed, EcoVadis |
| Fintech & AML | ComplyAdvantage, Chainalysis, Alloy, Sumsub |
| HR Compliance | BambooHR, Deel, Rippling, Gusto, Papaya Global |

Each vendor profile includes: description, pricing model, frameworks supported, deployment options, certifications (SOC 2, ISO 27001, GDPR), and an overall score.

**AI-Powered Vendor Assessment:** Subscribers can trigger an AI due diligence assessment on any vendor. The AI evaluates 5 dimensions (security posture, privacy compliance, compliance breadth, financial stability, product fit), scores each 0-100, and generates a detailed findings report with recommendations.

**URL:** [www.aigovhub.io/vendors](https://www.aigovhub.io/vendors)

---

### 6. ERP Compliance Gap Analysis

An interactive tool that analyzes whether your ERP system (SAP, Oracle, NetSuite, Dynamics 365, etc.) natively handles the regulations that apply to your business — or whether you need third-party solutions.

**How it works:**
1. Select your ERP system
2. Select the countries where you operate
3. Select your industry
4. The AI cross-references your ERP's capabilities against applicable regulations
5. You get: a list of applicable regulations, gap analysis (what's covered vs. what's missing), vendor recommendations for each gap, and a prioritized action plan

**Example output:** *"Your ERP (SAP S/4HANA) supports Poland's KSeF via the SAP Document Compliance add-on (included in license). Action: Enable KSeF integration in SAP DRC. No third-party tool needed. Estimated setup: 2-4 weeks."*

**URL:** [www.aigovhub.io/erp-analysis](https://www.aigovhub.io/erp-analysis) (requires Professional+ subscription)

---

### 7. AI Act Compliance Checker (Free Tool)

A step-by-step wizard that helps organizations determine their obligations under the EU AI Act:

- Classifies your AI system's risk level (Unacceptable, High, Limited, Minimal)
- Identifies specific compliance obligations based on your role (provider, deployer, importer)
- Generates a compliance timeline with key deadlines
- Produces a downloadable PDF report

**URL:** [www.aigovhub.io/ai-act-checker](https://www.aigovhub.io/ai-act-checker)

---

### 8. Vendor Risk Questionnaire Generator (Free Tool)

Generates customized vendor risk assessment questionnaires based on the frameworks you need:

- Supports SOC 2, ISO 27001, GDPR, HIPAA, and more
- Automatically identifies red flags in vendor responses
- Maps questions to specific framework controls
- Exports to PDF and DOCX formats

**URL:** [www.aigovhub.io/vendor-risk-questionnaire](https://www.aigovhub.io/vendor-risk-questionnaire)

---

### 9. Compliance Toolkits (Digital Products)

Downloadable compliance packages for teams that want ready-made templates:

| Product | Price | What's Included |
|---------|-------|----------------|
| AI Act Starter Toolkit | $49 | Essential checklists and templates for EU AI Act compliance |
| AI Act Professional Toolkit | $199 | Comprehensive compliance package with detailed guidance |
| Questionnaire Basic Pack | $99 | SOC 2 and ISO 27001 questionnaire mappings |
| Questionnaire Enterprise Pack | $499 | All frameworks with 1,000+ pre-written answers |

**URL:** [www.aigovhub.io/pricing](https://www.aigovhub.io/pricing)

---

## Pricing

| Tier | Price | Best For | Key Features |
|------|-------|----------|-------------|
| **Free** | $0/mo | Individual researchers | Blog access, 1 jurisdiction, vendor directory, 3 compliance checks/month |
| **Starter** | $99/mo | Small compliance teams | 3 jurisdictions, regulatory alerts, 5 vendor assessments/month, unlimited compliance checks |
| **Professional** | $499/mo | Mid-size organizations | 10 jurisdictions, ERP gap analysis, 25 vendor assessments/month, document generation |
| **Enterprise** | $2,000+/mo | Large enterprises | Unlimited everything, API access (1,000 req/day), SSO/SAML, custom reports, dedicated support |

**URL:** [www.aigovhub.io/pricing](https://www.aigovhub.io/pricing)

---

## How the AI Pipeline Works

The platform runs autonomously with minimal human intervention. Here's a simplified view:

```
CONTENT PIPELINE (runs every hour):
  Research Agent  →  Scans 130+ RSS feeds and regulatory sources
  Planner Agent   →  Identifies content gaps, prioritizes topics across domains
  Writer Agent    →  Produces SEO-optimized compliance articles
  QA Agent        →  Scores quality across 8 dimensions, rejects low-quality content
  Publisher Agent →  Publishes approved articles with metadata and social drafts

ALERT PIPELINE (runs every 4 hours):
  Alert Scanner   →  Analyzes recent evidence for regulatory changes
  Alert Matcher   →  Matches alerts to company profiles by country, industry, domain
  Alert Notifier  →  Delivers personalized alerts to user dashboards

VENDOR ASSESSMENT (on-demand):
  Admin triggers  →  AI Assessment Agent analyzes vendor across 5 dimensions
  Scores + Report →  Generates findings, recommendations, and composite risk score

ERP ANALYSIS (on-demand):
  User submits    →  AI cross-references ERP capabilities with applicable regulations
  Gap Analysis    →  Identifies gaps and recommends solutions from vendor database
```

**AI Model:** DeepSeek (chat model for content generation, reasoner model for complex analysis)
**Daily output:** 4-6 articles across all compliance domains
**Daily cost:** ~$12 in AI API usage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5 (React 19, App Router) |
| **Database** | PostgreSQL via Prisma 6 ORM |
| **Auth** | NextAuth v5 (credentials + OAuth) |
| **Payments** | Stripe v20 (subscriptions + one-time purchases) |
| **AI/LLM** | DeepSeek via OpenAI-compatible SDK |
| **Email** | Resend + React Email templates |
| **Rate Limiting** | Upstash Redis + Ratelimit |
| **Styling** | Tailwind CSS v3 + shadcn/ui components |
| **Hosting** | Railway (Docker-based deployment) |
| **Cron** | cron-job.org (content pipeline hourly, alerts every 4h) |
| **Language** | TypeScript 5.9 (strict mode) |

---

## Project Structure

```
aigovhub/
├── prisma/
│   └── schema.prisma          # 34 database models
├── scripts/
│   ├── seed-*.ts              # Database seeding scripts
│   └── sync-stripe-products.ts
├── src/
│   ├── app/
│   │   ├── (admin)/admin/     # Admin dashboard (agents, vendors, content, alerts, companies)
│   │   ├── (content)/         # Blog, vendors, jurisdictions (public pages)
│   │   ├── (dashboard)/       # User dashboard (company profile, alerts, purchases, settings)
│   │   ├── (marketing)/       # Homepage, pricing, about, contact, legal pages
│   │   ├── (tools)/           # AI Act checker, vendor risk questionnaire, ERP analysis
│   │   └── api/               # REST API routes (auth, stripe, agents, alerts, AI tools, etc.)
│   ├── components/
│   │   ├── layout/            # Header, sidebar, footer, mobile nav
│   │   ├── ui/                # shadcn/ui components (buttons, cards, badges, etc.)
│   │   └── *.tsx              # Feature-specific components
│   └── lib/
│       ├── agents/            # AI agent pipeline (research, planner, writer, QA, publisher)
│       │   ├── alert-*.ts     # Regulatory alert pipeline agents
│       │   ├── vendor-*.ts    # Vendor assessment agent
│       │   ├── erp-*.ts       # ERP analysis agent
│       │   └── pipeline.ts    # Main content pipeline orchestrator
│       ├── constants/         # Static data (company options, ERP capabilities, navigation)
│       ├── stripe/            # Stripe helpers (checkout, webhooks, subscriptions)
│       ├── seo/               # SEO metadata and sitemap generation
│       └── feature-gating.ts  # Subscription tier limits and usage tracking
├── Dockerfile                 # Production container definition
├── railway.toml               # Railway deployment config
└── package.json
```

---

## Admin Dashboard

The admin panel (`/admin`) provides full control over the platform:

| Section | What It Does |
|---------|-------------|
| **Agent Dashboard** | Monitor the AI content pipeline — runs, tasks, success rates, costs |
| **Agent Sources** | Manage 130+ RSS feeds and regulatory sources |
| **Agent Settings** | Configure daily targets, budgets, quality thresholds |
| **Content** | Create, edit, and manage all published articles |
| **Vendors** | Add, edit, and assess compliance vendors |
| **Alerts** | View all generated regulatory alerts, filter by urgency and domain |
| **Companies** | View all registered company profiles with industry and tier info |
| **Products** | Manage digital products (toolkits) and pricing |
| **Subscribers** | Manage email subscribers and sequences |
| **Affiliates** | Track affiliate links and click performance |
| **Analytics** | Platform usage analytics |

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Stripe account (for payments)
- DeepSeek API key (for AI features)
- Resend API key (for email)

### Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/aigovhub"

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_PRICE_SUB_STARTER="price_..."
STRIPE_PRICE_SUB_PRO="price_..."
STRIPE_PRICE_SUB_ENTERPRISE="price_..."

# AI
DEEPSEEK_API_KEY="sk-..."

# Email
RESEND_API_KEY="re_..."

# Rate Limiting
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Cron
CRON_SECRET="your-cron-secret"

# Admin
ADMIN_EMAIL="admin@example.com"
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data (vendors, sources, products)
npx prisma db seed

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

### Deployment (Railway)

The project deploys via Docker on Railway:

1. Push to `main` branch on GitHub
2. Railway auto-builds using the `Dockerfile`
3. On startup, `prisma db push --skip-generate` runs to sync schema
4. `npm start` launches the Next.js production server

---

## Database Models (34 Total)

| Category | Models |
|----------|--------|
| **Auth** | User, Account, Session, VerificationToken |
| **Commerce** | Subscription, Purchase, DigitalProduct |
| **Content** | ContentPage, ContentVendorMention, ContentAffiliateLink |
| **Vendors** | Vendor, VendorAssessment |
| **Company** | CompanyProfile |
| **Alerts** | RegulatoryAlert, CompanyAlert, AlertRun |
| **ERP** | ERPAnalysis |
| **Agents** | AgentSource, EvidenceCard, AgentTask, AgentTaskEvidence, AgentRun, AgentSettings, SocialPostDraft |
| **Email** | Subscriber, EmailSequence, EmailSequenceStep, SequenceProgress, EmailEvent |
| **Affiliates** | AffiliateLink, AffiliateClick |
| **Analytics** | AnalyticsEvent, SavedComplianceResult |
| **Usage** | UsageRecord |

---

## Key URLs

| Page | URL |
|------|-----|
| Homepage | [www.aigovhub.io](https://www.aigovhub.io) |
| Blog | [www.aigovhub.io/blog](https://www.aigovhub.io/blog) |
| Vendor Tracker | [www.aigovhub.io/vendors](https://www.aigovhub.io/vendors) |
| Jurisdiction Tracker | [www.aigovhub.io/jurisdictions](https://www.aigovhub.io/jurisdictions) |
| AI Act Checker | [www.aigovhub.io/ai-act-checker](https://www.aigovhub.io/ai-act-checker) |
| Vendor Risk Questionnaire | [www.aigovhub.io/vendor-risk-questionnaire](https://www.aigovhub.io/vendor-risk-questionnaire) |
| ERP Gap Analysis | [www.aigovhub.io/erp-analysis](https://www.aigovhub.io/erp-analysis) |
| Pricing | [www.aigovhub.io/pricing](https://www.aigovhub.io/pricing) |
| Dashboard | [www.aigovhub.io/dashboard](https://www.aigovhub.io/dashboard) |
| Admin | [www.aigovhub.io/admin](https://www.aigovhub.io/admin) |

---

## License

Proprietary. All rights reserved.

---

Built by **Saad Muhayyodin Maan** — [smaan@aimadds.com](mailto:smaan@aimadds.com)
