"use client";

import { useState } from "react";
import {
  Radar,
  Calendar,
  Globe,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Shield,
  Scale,
  FileText,
  Building2,
  TrendingUp,
  Filter,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Impact = "high" | "medium" | "low";
type Jurisdiction = "US" | "EU" | "UK" | "APAC" | "Global";

interface RegulatoryChange {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  regulator: string;
  impact: Impact;
  category: string;
  publishedDate: string;
  effectiveDate: string;
  summary: string;
}

interface Deadline {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  dueDate: string;
  daysRemaining: number;
  category: string;
  status: "on-track" | "at-risk" | "overdue";
}

interface ComplianceGap {
  area: string;
  jurisdiction: Jurisdiction;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: Impact;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const JURISDICTIONS: Jurisdiction[] = ["US", "EU", "UK", "APAC", "Global"];

const REGULATORY_CHANGES: RegulatoryChange[] = [
  {
    id: "RC-2026-047",
    title: "FinCEN Final Rule: Beneficial Ownership Reporting Updates",
    jurisdiction: "US",
    regulator: "FinCEN",
    impact: "high",
    category: "AML/CFT",
    publishedDate: "2026-03-07",
    effectiveDate: "2026-07-01",
    summary:
      "Expanded reporting requirements for beneficial ownership under the Corporate Transparency Act. New thresholds apply to entities with >$5M annual revenue.",
  },
  {
    id: "RC-2026-046",
    title: "EU AMLD6 Transposition Deadline & Member State Implementation",
    jurisdiction: "EU",
    regulator: "European Commission",
    impact: "high",
    category: "Anti-Money Laundering",
    publishedDate: "2026-03-05",
    effectiveDate: "2026-12-31",
    summary:
      "Sixth Anti-Money Laundering Directive mandates harmonized predicate offences, extended criminal liability, and enhanced cooperation between FIUs.",
  },
  {
    id: "RC-2026-045",
    title: "FCA Consumer Duty: Enhanced Outcomes Monitoring",
    jurisdiction: "UK",
    regulator: "FCA",
    impact: "medium",
    category: "Consumer Protection",
    publishedDate: "2026-03-04",
    effectiveDate: "2026-04-30",
    summary:
      "New reporting templates for firms to demonstrate consumer outcomes. Quarterly board attestation requirement introduced.",
  },
  {
    id: "RC-2026-044",
    title: "MAS Technology Risk Management Guidelines v3.0",
    jurisdiction: "APAC",
    regulator: "MAS Singapore",
    impact: "high",
    category: "Cybersecurity",
    publishedDate: "2026-03-03",
    effectiveDate: "2026-09-01",
    summary:
      "Updated TRM guidelines covering AI model risk, cloud concentration, and third-party API security requirements for financial institutions.",
  },
  {
    id: "RC-2026-043",
    title: "FATF Updated Guidance: Virtual Asset Service Providers",
    jurisdiction: "Global",
    regulator: "FATF",
    impact: "high",
    category: "Crypto Regulation",
    publishedDate: "2026-03-01",
    effectiveDate: "2026-06-01",
    summary:
      "Revised Travel Rule implementation standards for VASPs. Mandatory sunrise period for cross-border crypto transfers >$1,000.",
  },
  {
    id: "RC-2026-042",
    title: "SEC Climate Disclosure Rule: Phase 2 Large Accelerated Filers",
    jurisdiction: "US",
    regulator: "SEC",
    impact: "medium",
    category: "ESG / Climate",
    publishedDate: "2026-02-28",
    effectiveDate: "2026-06-15",
    summary:
      "Phase 2 requires Scope 1 & 2 emissions assurance for large accelerated filers. Material climate risk disclosure in 10-K filings.",
  },
  {
    id: "RC-2026-041",
    title: "EU AI Act: High-Risk Classification for Financial Services AI",
    jurisdiction: "EU",
    regulator: "European Parliament",
    impact: "high",
    category: "AI Governance",
    publishedDate: "2026-02-25",
    effectiveDate: "2026-08-01",
    summary:
      "Credit scoring, insurance pricing, and fraud detection AI systems classified as high-risk. Mandatory conformity assessments and human oversight.",
  },
  {
    id: "RC-2026-040",
    title: "APRA CPS 230 Operational Risk Management Standard",
    jurisdiction: "APAC",
    regulator: "APRA Australia",
    impact: "medium",
    category: "Operational Resilience",
    publishedDate: "2026-02-20",
    effectiveDate: "2026-07-01",
    summary:
      "New prudential standard for operational risk covering critical operations, material service providers, and business continuity requirements.",
  },
];

const DEADLINES: Deadline[] = [
  {
    id: "DL-001",
    title: "DORA ICT Risk Framework Compliance",
    jurisdiction: "EU",
    dueDate: "2026-03-17",
    daysRemaining: 8,
    category: "Operational Resilience",
    status: "at-risk",
  },
  {
    id: "DL-002",
    title: "FinCEN BOI Report Filing (Updated Entities)",
    jurisdiction: "US",
    dueDate: "2026-03-31",
    daysRemaining: 22,
    category: "AML/CFT",
    status: "on-track",
  },
  {
    id: "DL-003",
    title: "FCA Annual Financial Crime Return",
    jurisdiction: "UK",
    dueDate: "2026-04-15",
    daysRemaining: 37,
    category: "Financial Crime",
    status: "on-track",
  },
  {
    id: "DL-004",
    title: "MAS CMIT Notification: Material Outsourcing",
    jurisdiction: "APAC",
    dueDate: "2026-04-01",
    daysRemaining: 23,
    category: "Third-Party Risk",
    status: "on-track",
  },
  {
    id: "DL-005",
    title: "FCA Consumer Duty Board Report Submission",
    jurisdiction: "UK",
    dueDate: "2026-04-30",
    daysRemaining: 52,
    category: "Consumer Protection",
    status: "on-track",
  },
  {
    id: "DL-006",
    title: "FATF Mutual Evaluation Preparation (Self-assessment)",
    jurisdiction: "Global",
    dueDate: "2026-03-15",
    daysRemaining: 6,
    category: "AML/CFT",
    status: "at-risk",
  },
  {
    id: "DL-007",
    title: "SEC Climate Disclosure: Auditor Engagement Letter",
    jurisdiction: "US",
    dueDate: "2026-03-10",
    daysRemaining: 1,
    category: "ESG / Climate",
    status: "at-risk",
  },
];

const COMPLIANCE_GAPS: ComplianceGap[] = [
  { area: "Beneficial Ownership Reporting", jurisdiction: "US",     currentScore: 62, targetScore: 95, gap: 33, priority: "high" },
  { area: "AI Model Risk Management",       jurisdiction: "EU",     currentScore: 45, targetScore: 90, gap: 45, priority: "high" },
  { area: "Travel Rule Implementation",     jurisdiction: "Global", currentScore: 70, targetScore: 95, gap: 25, priority: "high" },
  { area: "Operational Resilience Testing",  jurisdiction: "UK",     currentScore: 78, targetScore: 95, gap: 17, priority: "medium" },
  { area: "Third-Party Risk Assessments",    jurisdiction: "APAC",   currentScore: 72, targetScore: 90, gap: 18, priority: "medium" },
  { area: "Consumer Outcomes Monitoring",    jurisdiction: "UK",     currentScore: 85, targetScore: 95, gap: 10, priority: "low" },
  { area: "Climate Risk Disclosure",         jurisdiction: "US",     currentScore: 55, targetScore: 90, gap: 35, priority: "high" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const IMPACT_STYLES: Record<Impact, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_STYLES: Record<string, string> = {
  "on-track": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "at-risk": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const JURISDICTION_COLORS: Record<Jurisdiction, string> = {
  US: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  EU: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  UK: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  APAC: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  Global: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300",
};

function gapBarColor(gap: number) {
  if (gap >= 30) return "bg-red-500";
  if (gap >= 15) return "bg-amber-500";
  return "bg-emerald-500";
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function RegulatoryRadarPage() {
  const [jurisdictionFilter, setJurisdictionFilter] = useState<Jurisdiction | "all">("all");
  const [impactFilter, setImpactFilter] = useState<Impact | "all">("all");

  const filteredChanges = REGULATORY_CHANGES.filter((c) => {
    if (jurisdictionFilter !== "all" && c.jurisdiction !== jurisdictionFilter) return false;
    if (impactFilter !== "all" && c.impact !== impactFilter) return false;
    return true;
  });

  const filteredDeadlines = DEADLINES.filter(
    (d) => jurisdictionFilter === "all" || d.jurisdiction === jurisdictionFilter
  ).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const filteredGaps = COMPLIANCE_GAPS.filter(
    (g) => jurisdictionFilter === "all" || g.jurisdiction === jurisdictionFilter
  );

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="h-6 w-6 text-emerald-500" />
            Regulatory Radar
          </h1>
          <p className="text-muted-foreground">
            Track regulatory changes, compliance deadlines, and jurisdiction-specific updates in
            real time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={jurisdictionFilter}
            onChange={(e) =>
              setJurisdictionFilter(e.target.value as Jurisdiction | "all")
            }
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Jurisdictions</option>
            {JURISDICTIONS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <select
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value as Impact | "all")}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Impact</option>
            <option value="high">High Impact</option>
            <option value="medium">Medium Impact</option>
            <option value="low">Low Impact</option>
          </select>
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Tracked Regulations", value: "312", icon: FileText, color: "text-blue-500" },
          { label: "Upcoming Deadlines", value: String(filteredDeadlines.length), icon: Calendar, color: "text-amber-500" },
          { label: "High-Impact Changes", value: String(REGULATORY_CHANGES.filter((c) => c.impact === "high").length), icon: AlertTriangle, color: "text-red-500" },
          { label: "Jurisdictions", value: "48", icon: Globe, color: "text-emerald-500" },
          { label: "Compliance Gaps", value: String(filteredGaps.length), icon: Shield, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-bold font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ---- Upcoming Deadlines ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            Upcoming Compliance Deadlines
          </h2>
        </div>
        <div className="divide-y">
          {filteredDeadlines.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-1 rounded-full p-1.5 ${
                    d.daysRemaining <= 7
                      ? "bg-red-100 dark:bg-red-900/40"
                      : d.daysRemaining <= 30
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-emerald-100 dark:bg-emerald-900/40"
                  }`}
                >
                  <Clock
                    className={`h-4 w-4 ${
                      d.daysRemaining <= 7
                        ? "text-red-600 dark:text-red-400"
                        : d.daysRemaining <= 30
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        JURISDICTION_COLORS[d.jurisdiction]
                      }`}
                    >
                      {d.jurisdiction}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-mono font-bold">
                    {d.daysRemaining}d
                  </p>
                  <p className="text-xs text-muted-foreground">{d.dueDate}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    STATUS_STYLES[d.status]
                  }`}
                >
                  {d.status.replace("-", " ")}
                </span>
              </div>
            </div>
          ))}
          {filteredDeadlines.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No upcoming deadlines for the selected jurisdiction.
            </div>
          )}
        </div>
      </div>

      {/* ---- Regulatory Changes Feed ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-500" />
            Recent Regulatory Changes
          </h2>
        </div>
        <div className="divide-y">
          {filteredChanges.map((change) => (
            <div
              key={change.id}
              className="p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {change.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        JURISDICTION_COLORS[change.jurisdiction]
                      }`}
                    >
                      {change.jurisdiction}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        IMPACT_STYLES[change.impact]
                      }`}
                    >
                      {change.impact} impact
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                      {change.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{change.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {change.summary}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {change.regulator}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Published: {change.publishedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Effective: {change.effectiveDate}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
          {filteredChanges.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No regulatory changes match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* ---- Compliance Gap Indicators ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          Compliance Gap Analysis
        </h2>
        <div className="space-y-3">
          {filteredGaps.map((gap) => (
            <div key={gap.area} className="rounded-md border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{gap.area}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      JURISDICTION_COLORS[gap.jurisdiction]
                    }`}
                  >
                    {gap.jurisdiction}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                    IMPACT_STYLES[gap.priority]
                  }`}
                >
                  {gap.priority} priority
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${gapBarColor(gap.gap)}`}
                      style={{ width: `${gap.currentScore}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                  <span className="font-mono font-bold">{gap.currentScore}%</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-mono text-muted-foreground">{gap.targetScore}%</span>
                  <span
                    className={`font-mono font-bold ${
                      gap.gap >= 30
                        ? "text-red-500"
                        : gap.gap >= 15
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    (-{gap.gap})
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredGaps.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No compliance gaps for the selected jurisdiction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
