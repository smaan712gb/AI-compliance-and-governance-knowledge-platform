# CCM Platform — Business Process Guide
### Continuous Controls Monitoring for ERP Systems
**AIGovHub.io | www.aigovhub.io/ccm**

---

## Table of Contents

1. [What is the CCM Platform?](#1-what-is-the-ccm-platform)
2. [Prerequisites](#2-prerequisites)
3. [Subscription Tiers at a Glance](#3-subscription-tiers-at-a-glance)
4. [Step-by-Step: Getting Started](#4-step-by-step-getting-started)
5. [Step-by-Step: Daily Operations](#5-step-by-step-daily-operations)
6. [Step-by-Step: Managing Findings](#6-step-by-step-managing-findings)
7. [Step-by-Step: Generating Compliance Reports](#7-step-by-step-generating-compliance-reports)
8. [Team Management & RBAC](#8-team-management--rbac)
9. [How AI (LLM) Works in the CCM Process](#9-how-ai-llm-works-in-the-ccm-process)
10. [LLM Configuration (BYOK)](#10-llm-configuration-byok)
11. [Audit Log & Evidence Management](#11-audit-log--evidence-management)
12. [Roles & Responsibilities](#12-roles--responsibilities)
13. [Supported Compliance Frameworks](#13-supported-compliance-frameworks)
14. [ERP Connectors — Current & Roadmap](#14-erp-connectors--current--roadmap)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. What is the CCM Platform?

The CCM (Continuous Controls Monitoring) Platform is an AI-powered ASaaS application that continuously monitors your ERP systems (SAP, Oracle, etc.) for compliance violations across financial controls, access controls, and regulatory frameworks including SOX, PCI DSS, AML/BSA, HIPAA, ISO 27001, NIST CSF, and GDPR.

**Core workflow:**

```
ERP System → Connector → Data Pull → Monitoring Rules → Findings → AI Analysis → Remediation → Reports
```

**Key capabilities:**
- Automated ERP data extraction on a configurable schedule (hourly to daily)
- Rule-based anomaly detection (threshold, pattern, SoD, access control checks)
- AI-powered finding analysis and remediation guidance
- Evidence collection and audit trail for external auditors
- Multi-user team with role-based access control
- Compliance report generation with AI narrative

---

## 2. Prerequisites

### 2.1 Organizational Prerequisites

| Requirement | Details |
|-------------|---------|
| Account on AIGovHub.io | Register at `/register` — free, takes 2 minutes |
| CCM Subscription | Starter ($499/mo), Professional ($1,499/mo), or Enterprise ($4,999/mo) |
| Organization created | One CCM organization per account (multi-org via team invitations) |
| Admin user | At least one user must have the ADMIN role |

### 2.2 Technical Prerequisites — SAP Connectors

If connecting to a live SAP system (S/4HANA Cloud, S/4HANA On-Premise, or SAP ECC):

| Requirement | Details |
|-------------|---------|
| SAP system accessible | Must be reachable from the internet or via SAP Cloud Connector / VPN |
| SAP Base URL | e.g., `https://my-sap.example.com:44300` |
| SAP Client number | e.g., `100` |
| Technical user account | A dedicated read-only service user in SAP (do **not** use a personal admin account) |
| OData API access | The technical user must have access to relevant OData V4 services |
| Authentication method | Basic Auth (username/password) or OAuth2 Client Credentials |
| Firewall allowlist | Whitelist AIGovHub IP ranges if your SAP has IP restrictions |

> **For Demo/Testing:** Use the **Mock Connector** — no SAP system required. It generates realistic compliance data instantly.

### 2.3 Permissions Required in SAP

The technical service user must have read access to:

| SAP Area | OData Service / Table | Used For |
|----------|----------------------|----------|
| Financial Accounting | BKPF, BSEG (journal entries) | SOX journal entry monitoring |
| Accounts Payable | REGUH, RBKP (payment runs) | SOX payment controls |
| User Administration | USR02, AGR_USERS (user access) | SoD violations, dormant accounts |
| Change Documents | CDHDR, CDPOS | ISO 27001 change log monitoring |
| General Ledger | FAGLFLEXT | Financial data analysis |

### 2.4 Browser Requirements

- Chrome 110+, Firefox 110+, Edge 110+, or Safari 16+
- JavaScript must be enabled
- No special plugins required

---

## 3. Subscription Tiers at a Glance

| Feature | Starter $499/mo | Professional $1,499/mo | Enterprise $4,999/mo |
|---------|----------------|----------------------|---------------------|
| ERP Connectors | 1 | 3 | Unlimited |
| Team Members | 5 | 15 | Unlimited |
| Monitoring Rules | 25 | 100 | Unlimited |
| AI Analyses/month | 100 | 500 | Unlimited |
| Frameworks | SOX | SOX + PCI DSS + AML/BSA | All 8 frameworks |
| Sync Frequency | 12-hour | 4-hour | 1-hour + real-time |
| Evidence Storage | 1 GB | 10 GB | 100 GB |
| Audit Log Retention | 90 days | 1 year | 7 years |
| LLM Provider | DeepSeek (included) | Any (BYOK) | Any (BYOK + self-hosted) |
| Support | Email | Priority | Dedicated CSM |

> **Recommendation for enterprise clients** (Estee Lauder, large banks, global manufacturers): Start with **Professional** to validate the integration, then upgrade to **Enterprise** for unlimited connectors across all business units.

---

## 4. Step-by-Step: Getting Started

### Step 1 — Register & Log In

1. Go to **www.aigovhub.io/register**
2. Create an account with your business email
3. Verify your email address
4. Log in at **www.aigovhub.io/login**

---

### Step 2 — Create Your CCM Organization

1. Navigate to **`/ccm/dashboard/settings`**
2. You will see the **"Create Organization"** form
3. Fill in:
   - **Organization Name:** e.g., `Estee Lauder Companies`
   - **Slug:** Auto-fills as `estee-lauder-companies` (can be edited — lowercase, hyphens only)
   - **Industry:** e.g., `Consumer Goods & Beauty`
   - **Company Size:** e.g., `62,000 employees`
4. Click **Create Organization**

> The slug is an internal identifier only — it does not appear in any external URLs.

---

### Step 3 — Subscribe to a Plan

After creating your organization, you will see the subscription plans on the same settings page.

1. Choose your plan: **Starter**, **Professional**, or **Enterprise**
2. Click **Subscribe**
3. You will be redirected to **Stripe Checkout** (secure payment page)
4. Enter your payment details
5. After successful payment, you are redirected back to the CCM dashboard with a confirmation message
6. Your subscription is immediately active — all features unlock instantly

> **Billing portal:** To update your payment method, download invoices, or cancel, click **"Manage Subscription & Billing"** on the Settings page — this opens the Stripe Billing Portal.

---

### Step 4 — Add an ERP Connector

1. Go to **`/ccm/dashboard/connectors`**
2. Click **"Add Connector"**
3. **Step 1 of 3 — Connector Details:**
   - **Connector Name:** e.g., `Production SAP S/4HANA - North America`
   - **ERP Type:** Select from `SAP S/4HANA Cloud`, `SAP S/4HANA On-Premise`, `SAP ECC`, or `Mock Connector (Demo)`
   - **Sync Frequency:** Choose how often data is pulled (Every Hour, Every 4 Hours, Every 12 Hours, Daily, or Manual)
4. **Step 2 of 3 — Connection Configuration:**
   - *For SAP:* Enter Base URL, Client number, authentication method (Basic or OAuth2), and credentials
   - *For Mock:* Enter a demo company name (e.g., `Estee Lauder Demo`)
5. **Step 3 of 3 — Review & Create:** Confirm details and click **Create Connector**
6. After creation, you land on the connector detail page
7. Click **"Test Connection"** to verify connectivity
8. If the test passes (green checkmark), click **"Sync Now"** to pull the first batch of data

> **Important:** Connector credentials (passwords, client secrets) are encrypted at rest using AES-256 before being stored. They are never stored in plaintext.

> **Sync frequency note:** Starter plan is limited to 12-hour minimum sync. Professional allows 4-hour. Enterprise allows 1-hour.

---

### Step 5 — Load Monitoring Rules

1. Go to **`/ccm/dashboard/rules`**
2. Click **"Load Built-in Templates"** to automatically create pre-built rules for your subscription tier
3. The system will create rules appropriate for your framework access (e.g., SOX rules on Starter)
4. Built-in rules include (by framework):

| Framework | Example Rules |
|-----------|--------------|
| SOX | High-value manual journal entries, payments without approval, SoD violations |
| PCI DSS | Changes to cardholder data stores, privileged access to CDE |
| AML/BSA | High-value wire transfers ($10k+), payments to sanctioned countries, structuring detection |
| HIPAA | Unauthorized access to PHI systems |
| ISO 27001 | Config changes without change tickets, dormant user accounts (90+ days) |

5. To create a **custom rule**, click **"New Rule"** and fill in:
   - Rule name and description
   - Framework (SOX, PCI DSS, etc.)
   - Control ID (e.g., `SOX-JE-01`)
   - Severity (Critical, High, Medium, Low)
   - Sync domain (which ERP data area to monitor)
   - Rule definition (threshold, pattern, SoD, or access control check)

---

### Step 6 — Run Your First Monitoring Cycle

1. Go to **`/ccm/dashboard/rules`**
2. Click **"Run Now"** on any rule (or all rules via the bulk run option)
3. The rule engine will:
   - Pull the relevant data from your ERP connector
   - Evaluate each data point against the rule conditions
   - Create **Findings** for any violations detected
4. Go to **`/ccm/dashboard/overview`** to see:
   - Compliance score (calculated from open findings by severity)
   - Recent critical/high findings
   - Connector sync status

---

## 5. Step-by-Step: Daily Operations

### Daily Checklist for Compliance Analysts

| Task | Where | Frequency |
|------|-------|-----------|
| Review new findings | `/ccm/dashboard/findings` | Daily |
| Check critical/high severity first | Filter by severity: CRITICAL | Daily |
| Assign findings to team members | Finding detail page | Daily |
| Review connector sync status | `/ccm/dashboard/connectors` | Daily |
| Check AI-generated analysis on new findings | Finding detail → AI Analysis card | Daily |
| Upload supporting evidence | `/ccm/dashboard/evidence` | As needed |

### Weekly Checklist for CCM Managers

| Task | Where | Frequency |
|------|-------|-----------|
| Generate compliance report | `/ccm/dashboard/reports` | Weekly |
| Review open findings older than 7 days | Findings → Date filter: Last 7d | Weekly |
| Review team member activity | `/ccm/dashboard/audit-log` | Weekly |
| Check usage limits (approaching limits?) | `/ccm/dashboard/settings` | Weekly |
| Export findings to CSV for stakeholder review | Findings page → Export CSV | Weekly |

### Monthly Checklist for CISO / VP Compliance

| Task | Where | Frequency |
|------|-------|-----------|
| Generate executive compliance report | Reports → Generate → All frameworks | Monthly |
| Review audit log for anomalies | `/ccm/dashboard/audit-log` | Monthly |
| Review subscription usage vs limits | Settings → usage bars | Monthly |
| Evaluate framework coverage gaps | Overview → framework coverage chips | Monthly |
| Update LLM configuration if needed | `/ccm/dashboard/settings/llm` | Quarterly |

---

## 6. Step-by-Step: Managing Findings

### Viewing Findings

1. Go to **`/ccm/dashboard/findings`**
2. Use filters to narrow down:
   - **Status:** Open, In Progress, Remediated, Accepted Risk, False Positive, Closed
   - **Severity:** Critical, High, Medium, Low
   - **Framework:** SOX, PCI DSS, AML/BSA, etc.
   - **Date Range:** Last 7 days, 30 days, 90 days
3. Findings are sorted by severity (Critical → High → Medium → Low)
4. Click any finding to open the detail page

### Investigating a Finding

On the finding detail page:

1. **Details card** — shows framework, control ID, rule name, detection timestamp, linked data points
2. **AI Analysis** — AI-generated explanation of why this was flagged and what it means
3. **Related Data Points** — the actual ERP records that triggered the finding (journal entry, payment, user access record, etc.)
4. **Remediation Plan** — click **"Generate Remediation Plan"** for AI-powered step-by-step fix guidance

### Updating Finding Status

1. Open the finding
2. In the **"Update Status"** card, select a new status:
   - **Open** — newly detected, not yet reviewed
   - **In Progress** — assigned and being investigated
   - **Remediated** — fix has been applied
   - **Accepted Risk** — risk acknowledged by management; no fix planned
   - **False Positive** — rule triggered incorrectly; not a real violation
   - **Closed** — fully resolved and closed
3. Add **Resolution Notes** explaining the action taken
4. Click **Update Finding**

> All status changes are logged to the Audit Trail automatically.

### Bulk Status Update

On the findings list page:
1. Select multiple findings using the checkboxes on the left
2. Choose a new status from the **"Mark as…"** dropdown
3. Confirm — all selected findings are updated simultaneously

### Exporting Findings

On the findings list page, click **"Export CSV"** to download all currently visible findings as a CSV file. Use this for:
- Sharing with external auditors
- Loading into Excel/Power BI for analysis
- Evidence packs for regulatory submissions

---

## 7. Step-by-Step: Generating Compliance Reports

1. Go to **`/ccm/dashboard/reports`**
2. Click **"Generate Report"**
3. Select:
   - **Report Type:** SOX Compliance Summary, PCI DSS Assessment, AML/BSA Risk Summary, Executive Dashboard, etc.
   - **Title:** e.g., `Q1 2026 SOX Compliance Report — Estee Lauder`
4. Click **Generate** — the AI system will:
   - Pull all findings for the selected framework
   - Calculate a compliance score
   - Write a narrative summary (risks, trends, remediation status)
   - Include statistics (total findings, by severity, open vs closed)
5. The report appears in the list — click to expand and view
6. Options:
   - **Copy to Clipboard** — paste the narrative into an email or presentation
   - **Export as Markdown** — download as `.md` file for documentation systems
7. Reports are stored permanently and can be accessed by auditors

> **Audit use case:** Share report access with external auditors by inviting them as a **Viewer** team member — they can read reports and findings but cannot modify anything.

---

## 8. Team Management & RBAC

### Roles

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access: create/edit/delete everything, manage team, billing |
| **MANAGER** | Create connectors, rules, findings; invite members; generate reports |
| **ANALYST** | View and update findings; upload evidence; cannot create connectors |
| **VIEWER** | Read-only access to all data; suitable for auditors and executives |

### Inviting Team Members

1. Go to **`/ccm/dashboard/team`**
2. Click **"Invite Member"**
3. Enter the user's email address and select their role
4. The user receives an invitation email
5. Once they accept and register, they appear on the team list

### Removing Team Members

1. Go to **`/ccm/dashboard/team`**
2. Find the member and click **"Remove"**
3. Their access is revoked immediately

> **Seat limits:** Starter = 5 members, Professional = 15 members, Enterprise = unlimited.

---

## 9. How AI (LLM) Works in the CCM Process

The AI model (DeepSeek by default, or your own provider via BYOK) has **three specific jobs** in the CCM workflow. It sits on top of the rule engine — the rule engine decides what is a violation, the AI explains it and tells you what to do about it.

```text
Rule Engine detects violation
        ↓
Finding created (binary: pass/fail)
        ↓
AI analyses the finding in plain language
        ↓
User requests remediation plan (on-demand)
        ↓
AI writes step-by-step fix guidance
        ↓
User generates compliance report
        ↓
AI writes the executive narrative
```

### Job 1 — Finding Analysis (Automatic, batch)

Immediately after a monitoring rule fires and creates a finding, the AI automatically writes a **2–3 paragraph analysis** explaining:

1. What happened and why it matters in the context of the specific control
2. The potential business and regulatory impact (e.g., SOX Section 404 exposure, PCI DSS non-compliance risk)
3. The recommended immediate action

The AI receives the actual ERP data that triggered the finding — for example, the exact journal entry amount, the payment record with the missing approver field, or the user's conflicting SAP roles — and explains it in plain compliance language.

- Runs automatically in batches of up to 20 unanalysed open findings
- Low temperature (0.2) — factual, structured, minimal creativity
- Output appears as the **"AI Analysis"** card on the finding detail page
- Counts toward your monthly AI analyses quota

**Example input to AI:**

```text
Finding: Payments without proper approval
Severity: CRITICAL
Rule: SOX-PAY-01 — Payments without proper approval
Control: SOX-PAY-01
Data: [PAYMENT_RUN] { "paymentId": "PAY-00123", "amount": 85000,
      "currency": "USD", "approvedBy": null, "vendor": "ACME Ltd" }
```

**Example AI output:**
> *A payment of $85,000 to ACME Ltd (PAY-00123) was processed without any approver recorded in the system, directly violating the dual-control requirement under SOX Section 302/404. This creates a material weakness in your financial reporting controls...*

---

### Job 2 — Remediation Plan (On-demand, streaming)

When a user clicks **"Generate Remediation Plan"** on a finding, the AI streams a **step-by-step remediation plan** tailored to that specific control violation and ERP system.

- Text streams in real-time (appears word by word as it generates)
- Specific to the framework, control ID, and the actual data involved
- Stored against the finding for future reference

**Examples by finding type:**

| Finding Type | What the AI Produces |
| --- | --- |
| Payment without approval | Steps to implement dual-control in SAP FI; how to retroactively document approval |
| SoD violation | Which conflicting SAP roles to remove; how to apply compensating controls |
| AML structuring detected | What SAR to file, who to notify, whether to freeze the transactions |
| Dormant user accounts | SAP t-code to lock accounts; process for periodic access review |
| Config change without ticket | Retroactive change ticket procedure; how to enforce CHARM integration |

---

### Job 3 — Compliance Report Narrative (On-demand)

When generating a compliance report, the AI writes a **full executive narrative** that transforms raw finding data into a structured document:

- Overall compliance posture and risk score with trend direction
- Summary of findings by severity and framework
- Remediation status (open vs closed vs accepted risk)
- Key risk areas and recommended priorities for the next period
- Suitable for board presentation, external auditors, and regulatory submissions

The report is generated once and stored permanently. It can be copied to clipboard or exported as Markdown.

---

### How Provider Selection Works

```text
AI is needed (analysis / remediation / report)
        ↓
Does the org have a BYOK LLM configured?
   YES → Use their key: OpenAI / Anthropic / Azure OpenAI / Google Vertex
   NO  → Fall back to platform DeepSeek (included, no extra cost)
```

**DeepSeek** (`deepseek-chat`) is the default — cost-effective and highly capable at structured compliance analysis. Professional and Enterprise customers can switch to **GPT-4o**, **Claude 3.5 Sonnet**, or **Azure OpenAI** from `/ccm/dashboard/settings/llm`. This is useful when:

- The client has **data residency** requirements (use Azure OpenAI in their own tenant)
- The client has an **existing AI contract** (use their OpenAI or Anthropic credits)
- Higher accuracy is needed for complex **AML or HIPAA** analysis

---

### What the AI Does NOT Do

| Does NOT | Why |
| --- | --- |
| Pull data from ERP | The connector handles all data extraction |
| Decide what is a violation | The rule engine makes all pass/fail decisions |
| Automatically remediate anything | All remediation actions require a human |
| See passwords or credentials | Those are encrypted separately; AI never receives them |
| Run continuously | AI is invoked only when a finding is created or a user requests it |

---

## 10. LLM Configuration (BYOK)

The platform uses AI for finding analysis and report generation. By default, **DeepSeek** is provided at no extra cost on all tiers. Professional and Enterprise customers can bring their own LLM API key.

### Configuring a Custom LLM

1. Go to **`/ccm/dashboard/settings/llm`**
2. Select your LLM provider:
   - **DeepSeek** (default, included)
   - **OpenAI** (GPT-4o, GPT-4-turbo) — Professional+
   - **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus) — Professional+
   - **Azure OpenAI** — Professional+
   - **Google Vertex AI** — Professional+
3. Enter your API key
4. Optionally set the model name and max tokens
5. Click **Save Configuration**

> Your API key is encrypted with AES-256 before being stored. It is decrypted only at the moment of API call and never logged.

---

## 11. Audit Log & Evidence Management

### Audit Log

The audit log records every action taken in the platform:

- Who performed the action (user ID + email)
- What action was taken (connector created, finding updated, report generated, member invited, etc.)
- When it happened (timestamp)
- IP address and browser

**Access:** `/ccm/dashboard/audit-log`

**Retention:** 90 days (Starter), 1 year (Professional), 7 years (Enterprise)

**Use case:** Present to external auditors (SOX Section 404, PCI DSS Req 10) as evidence of monitoring activity.

### Evidence Management

Upload supporting documentation, screenshots, and remediation evidence:

1. Go to **`/ccm/dashboard/evidence`**
2. Click **"Upload Evidence"**
3. Attach files (PDFs, images, spreadsheets)
4. Tag evidence to a specific finding or framework
5. Evidence is stored securely with an immutable timestamp

---

## 12. Roles & Responsibilities

### Recommended Team Structure

| Person | Role in CCM | Key Responsibilities |
|--------|-------------|---------------------|
| CISO / VP Compliance | ADMIN | Platform setup, subscription management, executive reporting |
| Internal Audit Manager | MANAGER | Rule configuration, findings review, team management |
| Compliance Analyst (x2) | ANALYST | Daily findings review, evidence uploads, remediation tracking |
| External Auditors | VIEWER | Read reports, findings, and evidence during audit cycles |
| IT/SAP Basis Team | ANALYST | Connector setup, SAP technical user creation |

---

## 13. Supported Compliance Frameworks

| Framework | Description | Available On |
|-----------|-------------|--------------|
| **SOX** | Sarbanes-Oxley Act — financial reporting controls | All tiers |
| **PCI DSS** | Payment Card Industry Data Security Standard | Professional + |
| **AML/BSA** | Anti-Money Laundering / Bank Secrecy Act | Professional + |
| **HIPAA** | Health Insurance Portability and Accountability Act | Enterprise |
| **GDPR** | General Data Protection Regulation | Enterprise |
| **ISO 27001** | Information Security Management System | Enterprise |
| **NIST CSF** | NIST Cybersecurity Framework | Enterprise |
| **Custom** | Build your own framework and control IDs | Enterprise |

---

## 14. ERP Connectors — Current & Roadmap

| ERP System | Status | Notes |
|------------|--------|-------|
| **SAP S/4HANA Cloud** | Live | OData V4 API |
| **SAP S/4HANA On-Premise** | Live | Via Cloud Connector or VPN |
| **SAP ECC 6.0** | Live | OData or RFC |
| **Mock / Demo** | Live | Generates realistic test data |
| Oracle ERP Cloud | Q3 2026 | Oracle Fusion REST API |
| Workday | Q3 2026 | Workday Financial Management |
| SAP Concur | Q4 2026 | T&E compliance |
| Microsoft Dynamics 365 | Q1 2027 | Finance & Operations |
| Oracle NetSuite | Q2 2027 | Mid-market ERP |

---

## 15. Troubleshooting

### Connector Test Fails

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Connection refused" | SAP not reachable from internet | Enable SAP Cloud Connector or open firewall |
| "401 Unauthorized" | Wrong username/password | Re-enter SAP credentials |
| "403 Forbidden" | User lacks OData authorization | Add OData access roles to SAP technical user |
| "SSL error" | Self-signed certificate | Contact support to add certificate exception |

### No Findings Generated

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Rules run but 0 findings | Data doesn't violate rule conditions | This is good — check the data manually to confirm |
| Rules run but 0 data points | Connector sync hasn't run | Click "Sync Now" on the connector first |
| Rule fails to run | Connector inactive | Check connector status — re-test connection |

### Subscription / Billing Issues

| Symptom | Fix |
|---------|-----|
| "No active subscription" after payment | Wait 2-3 minutes for webhook; refresh the settings page |
| Checkout fails | Check Stripe price IDs are configured in Railway environment variables |
| Can't access billing portal | You must have completed a checkout first (Stripe customer must exist) |

### Feature Limit Errors (403)

If you see "Limit reached" errors:
1. Check your current usage on `/ccm/dashboard/settings`
2. Usage bars show current usage vs limit
3. Upgrade your plan via the **"Upgrade"** button or the **Stripe Billing Portal**

---

## Quick Reference — Key URLs

| Page | URL |
|------|-----|
| CCM Marketing Page | `/ccm` |
| Pricing | `/ccm/pricing` |
| Dashboard Overview | `/ccm/dashboard` |
| Connectors | `/ccm/dashboard/connectors` |
| Add Connector | `/ccm/dashboard/connectors/new` |
| Monitoring Rules | `/ccm/dashboard/rules` |
| Findings | `/ccm/dashboard/findings` |
| Evidence | `/ccm/dashboard/evidence` |
| Reports | `/ccm/dashboard/reports` |
| Team Management | `/ccm/dashboard/team` |
| Settings & Billing | `/ccm/dashboard/settings` |
| LLM Configuration | `/ccm/dashboard/settings/llm` |
| Audit Log | `/ccm/dashboard/audit-log` |

---

*Document version: February 2026 | AIGovHub.io CCM Platform*
