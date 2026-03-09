"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Globe,
  TrendingUp,
  Ban,
  FileWarning,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScreeningResult {
  entityName: string;
  entityType: string;
  compositeScore: number;
  recommendation: string;
  sanctionsScore: number;
  pepScore: number;
  adverseMediaScore: number;
  geographicRiskScore: number;
  riskFactors: string[];
  sanctionsMatches: { matchedName: string; listName: string; score: number }[];
  screenedAt: string;
}

interface HistoricalResult {
  id: string;
  entityName: string;
  entityType: string;
  compositeScore: number;
  recommendation: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Static / mock data                                                 */
/* ------------------------------------------------------------------ */

const REC_STYLES: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
  block:                     { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",       Icon: XCircle },
  enhanced_due_diligence:    { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", Icon: AlertTriangle },
  standard:                  { cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",   Icon: Search },
  clear:                     { cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", Icon: CheckCircle2 },
  BLOCK:                     { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",       Icon: XCircle },
  ENHANCED_DUE_DILIGENCE:    { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", Icon: AlertTriangle },
  STANDARD:                  { cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",   Icon: Search },
  CLEAR:                     { cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", Icon: CheckCircle2 },
};

const PEP_SUMMARY = [
  { label: "Active PEP Matches",   value: 14,  delta: "+3 this week",  color: "text-red-500" },
  { label: "Close Associates",     value: 38,  delta: "+7 this week",  color: "text-amber-500" },
  { label: "Former PEPs",          value: 22,  delta: "No change",     color: "text-blue-500" },
  { label: "Cleared Entities",     value: 189, delta: "+12 this week", color: "text-emerald-500" },
];

const AML_INDICATORS = [
  { label: "Structuring Patterns Detected",     count: 7,  severity: "high"   as const },
  { label: "Unusual Cross-border Transfers",     count: 12, severity: "high"   as const },
  { label: "Rapid Movement of Funds",            count: 4,  severity: "medium" as const },
  { label: "Shell Company Linkages",             count: 9,  severity: "high"   as const },
  { label: "Dormant Account Reactivations",      count: 3,  severity: "medium" as const },
  { label: "Round-trip Transaction Patterns",    count: 2,  severity: "low"    as const },
];

const SEVERITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low:    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function SanctionsAmlPage() {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("person");
  const [countryCode, setCountryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [history, setHistory] = useState<HistoricalResult[]>([]);
  const [error, setError] = useState("");

  // Load recent screenings on mount
  useEffect(() => {
    fetch("/api/sentinel/screening?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setHistory(data.data);
      })
      .catch(() => {});
  }, []);

  async function handleScreen() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sentinel/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          entityType,
          countryCode: countryCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Screening failed");
        return;
      }
      setResult(data.data);

      // Refresh history
      fetch("/api/sentinel/screening?limit=10")
        .then((r) => r.json())
        .then((d) => {
          if (d?.data) setHistory(d.data);
        })
        .catch(() => {});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ban className="h-6 w-6 text-red-500" />
          Sanctions &amp; AML
        </h1>
        <p className="text-muted-foreground">
          Consolidated sanctions screening, AML transaction monitoring, and PEP exposure tracking
        </p>
      </div>

      {/* ---- Screening Form ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-500" />
          Entity Screening
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Entity Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScreen()}
              placeholder="e.g. Viktor Petrov or Meridian Holdings Ltd"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="person">Person</option>
              <option value="organization">Organization</option>
              <option value="vessel">Vessel</option>
              <option value="aircraft">Aircraft</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country (ISO-2)</label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="e.g. RU"
              maxLength={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleScreen}
          disabled={loading || !name.trim()}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Screen Entity
            </>
          )}
        </Button>
      </div>

      {/* ---- Screening Result ---- */}
      {result && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{result.entityName}</h3>
              <p className="text-sm text-muted-foreground capitalize">{result.entityType}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">{result.compositeScore}</div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  REC_STYLES[result.recommendation]?.cls || ""
                }`}
              >
                {result.recommendation.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sanctions", score: result.sanctionsScore, color: "red" },
              { label: "PEP", score: result.pepScore, color: "purple" },
              { label: "Adverse Media", score: result.adverseMediaScore, color: "amber" },
              { label: "Geographic", score: result.geographicRiskScore, color: "blue" },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-muted/50 p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-xl font-bold font-mono">{item.score}</div>
              </div>
            ))}
          </div>

          {/* Risk Factors */}
          {result.riskFactors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Risk Factors</h4>
              <ul className="space-y-1">
                {result.riskFactors.map((f, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sanctions Matches */}
          {result.sanctionsMatches.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Sanctions List Matches</h4>
              <div className="space-y-2">
                {result.sanctionsMatches.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/40 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.matchedName}</p>
                      <p className="text-xs text-muted-foreground">{m.listName}</p>
                    </div>
                    <span className="text-sm font-bold font-mono">{m.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- PEP Exposure Summary ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          PEP Exposure Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PEP_SUMMARY.map((card) => (
            <div key={card.label} className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.delta}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---- AML Risk Indicators ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-500" />
          AML Risk Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AML_INDICATORS.map((ind) => (
            <div
              key={ind.label}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <FileWarning className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{ind.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono">{ind.count}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                    SEVERITY_BADGE[ind.severity]
                  }`}
                >
                  {ind.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Recent Screenings History ---- */}
      {history.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-5 border-b flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold">Recent Screenings</h3>
          </div>
          <div className="divide-y">
            {history.map((h) => {
              const style = REC_STYLES[h.recommendation];
              return (
                <div key={h.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{h.entityName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {h.entityType} &middot;{" "}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold font-mono">{h.compositeScore}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${style?.cls || ""}`}
                    >
                      {h.recommendation.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Quick Stats Footer ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Lists Monitored", value: "47", icon: ShieldAlert, color: "text-red-500" },
          { label: "Countries Covered", value: "194", icon: Globe, color: "text-blue-500" },
          { label: "Screenings Today", value: "1,243", icon: TrendingUp, color: "text-emerald-500" },
          { label: "Alerts Pending", value: "18", icon: AlertTriangle, color: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-bold font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
