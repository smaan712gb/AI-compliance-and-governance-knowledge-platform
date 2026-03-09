"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  FileSearch,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter,
  Banknote,
  Fingerprint,
  Ship,
  Building2,
  CircleDollarSign,
  Eye,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Severity = "critical" | "high" | "medium" | "low";

interface FraudSignal {
  id: string;
  title: string;
  source: string;
  severity: Severity;
  timestamp: string;
  description: string;
  category: string;
}

interface SuspiciousTransaction {
  id: string;
  entity: string;
  amount: string;
  currency: string;
  origin: string;
  destination: string;
  riskScore: number;
  pattern: string;
  date: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const SUMMARY_CARDS = [
  {
    label: "Active Alerts",
    value: 47,
    delta: "+8",
    trend: "up" as const,
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    label: "Suspicious Activity Reports",
    value: 23,
    delta: "+3",
    trend: "up" as const,
    icon: FileSearch,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    label: "Investigation Queue",
    value: 12,
    delta: "-2",
    trend: "down" as const,
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Cases Closed (30d)",
    value: 89,
    delta: "+15",
    trend: "up" as const,
    icon: ShieldAlert,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
];

const FRAUD_SIGNALS: FraudSignal[] = [
  {
    id: "FS-2024-001",
    title: "Velocity anomaly detected on high-value wire transfers",
    source: "Transaction Monitoring Engine",
    severity: "critical",
    timestamp: "2026-03-09T08:14:00Z",
    description:
      "12 wire transfers totaling $4.2M routed through 3 intermediary banks in 48 hours. Pattern consistent with layering scheme.",
    category: "Wire Fraud",
  },
  {
    id: "FS-2024-002",
    title: "Synthetic identity cluster linked to new account openings",
    source: "Identity Verification Module",
    severity: "high",
    timestamp: "2026-03-09T07:32:00Z",
    description:
      "Cluster of 8 accounts opened with synthetic SSNs sharing common address elements. Credit bureau mismatches flagged.",
    category: "Identity Fraud",
  },
  {
    id: "FS-2024-003",
    title: "Trade invoice anomaly: over-invoicing on commodity imports",
    source: "Trade Finance Monitor",
    severity: "high",
    timestamp: "2026-03-08T22:47:00Z",
    description:
      "Copper import invoices from shell entity in Dubai priced 340% above LME spot. Likely trade-based money laundering.",
    category: "TBML",
  },
  {
    id: "FS-2024-004",
    title: "Unusual cryptocurrency on-ramp activity from sanctioned jurisdiction",
    source: "Blockchain Analytics",
    severity: "critical",
    timestamp: "2026-03-08T19:05:00Z",
    description:
      "Wallet cluster associated with Iranian IP addresses converted $890K USDT to BTC via nested exchange. OFAC exposure risk.",
    category: "Crypto AML",
  },
  {
    id: "FS-2024-005",
    title: "Payroll ghost employee pattern in subsidiary accounts",
    source: "Internal Audit Feed",
    severity: "medium",
    timestamp: "2026-03-08T16:20:00Z",
    description:
      "3 employee IDs receiving payroll deposits with no corresponding HR records. Accounts share same beneficiary routing.",
    category: "Internal Fraud",
  },
  {
    id: "FS-2024-006",
    title: "Dormant trust account reactivation with large inflows",
    source: "Account Monitoring",
    severity: "medium",
    timestamp: "2026-03-08T11:55:00Z",
    description:
      "Trust account dormant for 18 months received $1.7M in 3 deposits. Beneficiary structure recently changed.",
    category: "Money Laundering",
  },
];

const TBML_INDICATORS = [
  {
    indicator: "Over / Under Invoicing",
    count: 14,
    trend: "up",
    jurisdictions: ["UAE", "HK", "SG"],
    riskLevel: "high" as Severity,
  },
  {
    indicator: "Multiple Invoicing",
    count: 6,
    trend: "stable",
    jurisdictions: ["TR", "NG"],
    riskLevel: "medium" as Severity,
  },
  {
    indicator: "Phantom Shipments",
    count: 3,
    trend: "up",
    jurisdictions: ["PA", "LR"],
    riskLevel: "critical" as Severity,
  },
  {
    indicator: "Black Market Peso Exchange",
    count: 2,
    trend: "down",
    jurisdictions: ["CO", "MX"],
    riskLevel: "high" as Severity,
  },
  {
    indicator: "Commodity Misclassification",
    count: 8,
    trend: "up",
    jurisdictions: ["CN", "MY", "VN"],
    riskLevel: "medium" as Severity,
  },
];

const SUSPICIOUS_TRANSACTIONS: SuspiciousTransaction[] = [
  {
    id: "STR-9821",
    entity: "Meridian Trade Holdings LLC",
    amount: "2,340,000",
    currency: "USD",
    origin: "Cayman Islands",
    destination: "Switzerland",
    riskScore: 94,
    pattern: "Layering",
    date: "2026-03-09",
  },
  {
    id: "STR-9820",
    entity: "Al-Rashid Import/Export Co.",
    amount: "870,000",
    currency: "EUR",
    origin: "UAE",
    destination: "Turkey",
    riskScore: 87,
    pattern: "Trade-based ML",
    date: "2026-03-09",
  },
  {
    id: "STR-9818",
    entity: "Nexus Digital Assets Ltd",
    amount: "1,120,000",
    currency: "USDT",
    origin: "Hong Kong",
    destination: "Singapore",
    riskScore: 82,
    pattern: "Crypto Layering",
    date: "2026-03-08",
  },
  {
    id: "STR-9815",
    entity: "GreenField Agri Corp",
    amount: "560,000",
    currency: "USD",
    origin: "Nigeria",
    destination: "UK",
    riskScore: 76,
    pattern: "Invoice Fraud",
    date: "2026-03-08",
  },
  {
    id: "STR-9812",
    entity: "Vostok Shipping GmbH",
    amount: "3,100,000",
    currency: "USD",
    origin: "Russia",
    destination: "UAE",
    riskScore: 91,
    pattern: "Sanctions Evasion",
    date: "2026-03-07",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const CATEGORY_ICONS: Record<string, typeof Banknote> = {
  "Wire Fraud": Banknote,
  "Identity Fraud": Fingerprint,
  TBML: Ship,
  "Crypto AML": CircleDollarSign,
  "Internal Fraud": Building2,
  "Money Laundering": CircleDollarSign,
};

function riskScoreColor(score: number) {
  if (score >= 90) return "text-red-500";
  if (score >= 75) return "text-orange-500";
  if (score >= 50) return "text-amber-500";
  return "text-green-500";
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function FinancialCrimePage() {
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...new Set(FRAUD_SIGNALS.map((s) => s.category))];

  const filteredSignals = FRAUD_SIGNALS.filter((s) => {
    if (severityFilter !== "all" && s.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Fingerprint className="h-6 w-6 text-red-500" />
          Financial Crime Intelligence
        </h1>
        <p className="text-muted-foreground">
          Fraud detection signals, suspicious activity monitoring, and trade-based money laundering analysis
        </p>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.label} className={`rounded-lg border p-4 ${card.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span
                className={`text-xs font-semibold flex items-center gap-0.5 ${
                  card.trend === "up" ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {card.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {card.delta}
              </span>
            </div>
            <p className="text-2xl font-bold font-mono">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ---- Fraud Signal Feed ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fraud Signal Feed
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="divide-y">
          {filteredSignals.map((signal) => {
            const CatIcon = CATEGORY_ICONS[signal.category] || AlertTriangle;
            return (
              <div key={signal.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <CatIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          {signal.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            SEVERITY_STYLES[signal.severity]
                          }`}
                        >
                          {signal.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {signal.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{signal.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(signal.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredSignals.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No signals match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* ---- Trade-Based Money Laundering Indicators ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Ship className="h-5 w-5 text-blue-500" />
          Trade-Based Money Laundering Indicators
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Indicator</th>
                <th className="pb-2 font-medium text-muted-foreground text-center">Detections</th>
                <th className="pb-2 font-medium text-muted-foreground text-center">Trend</th>
                <th className="pb-2 font-medium text-muted-foreground">Jurisdictions</th>
                <th className="pb-2 font-medium text-muted-foreground text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TBML_INDICATORS.map((row) => (
                <tr key={row.indicator}>
                  <td className="py-3 font-medium">{row.indicator}</td>
                  <td className="py-3 text-center font-mono font-bold">{row.count}</td>
                  <td className="py-3 text-center">
                    {row.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-red-500 mx-auto" />
                    ) : row.trend === "down" ? (
                      <ArrowDownRight className="h-4 w-4 text-emerald-500 mx-auto" />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 flex-wrap">
                      {row.jurisdictions.map((j) => (
                        <span
                          key={j}
                          className="px-1.5 py-0.5 rounded text-xs bg-muted font-mono"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        SEVERITY_STYLES[row.riskLevel]
                      }`}
                    >
                      {row.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Suspicious Transaction Patterns ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-500" />
            Suspicious Transaction Patterns
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Pattern</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center">Risk</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SUSPICIOUS_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
                  <td className="px-4 py-3 font-medium">{tx.entity}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {tx.currency} {tx.amount}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {tx.origin} &rarr; {tx.destination}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-muted">{tx.pattern}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold font-mono ${riskScoreColor(tx.riskScore)}`}>
                      {tx.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
