"use client";

import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
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
  sanctionsScore: number;
  pepScore: number;
  adverseMediaScore: number;
  geographicRiskScore: number;
  countryCode: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

function scoreColor(score: number) {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-amber-500";
  return "text-green-500";
}

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
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetch("/api/sentinel/screening?limit=20")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setHistory(data.data);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
      loadHistory(); // refresh after new screening
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Derive stats from real screening history
  const pepMatches = history.filter((h) => h.pepScore > 30).length;
  const sanctionsHits = history.filter((h) => h.sanctionsScore > 50).length;
  const highRisk = history.filter((h) => h.compositeScore >= 70).length;
  const cleared = history.filter(
    (h) => h.recommendation === "CLEAR" || h.recommendation === "clear"
  ).length;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ban className="h-6 w-6 text-red-500" />
            Sanctions &amp; AML
          </h1>
          <p className="text-muted-foreground">
            Entity screening, AML monitoring, and PEP exposure analysis
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
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
              <div className={`text-3xl font-bold font-mono ${scoreColor(result.compositeScore)}`}>
                {result.compositeScore}
              </div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  REC_STYLES[result.recommendation]?.cls || ""
                }`}
              >
                {result.recommendation.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sanctions", score: result.sanctionsScore },
              { label: "PEP", score: result.pepScore },
              { label: "Adverse Media", score: result.adverseMediaScore },
              { label: "Geographic", score: result.geographicRiskScore },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-muted/50 p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className={`text-xl font-bold font-mono ${scoreColor(item.score)}`}>
                  {item.score}
                </div>
              </div>
            ))}
          </div>

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

      {/* ---- Screening Analytics (derived from real data) ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-500" />
          Screening Analytics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Screenings</p>
            <p className="text-2xl font-bold font-mono">{history.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">High-Risk Entities</p>
            <p className={`text-2xl font-bold font-mono ${highRisk > 0 ? "text-red-500" : ""}`}>
              {highRisk}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Sanctions Hits</p>
            <p className={`text-2xl font-bold font-mono ${sanctionsHits > 0 ? "text-red-500" : ""}`}>
              {sanctionsHits}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">PEP Matches</p>
            <p className={`text-2xl font-bold font-mono ${pepMatches > 0 ? "text-amber-500" : ""}`}>
              {pepMatches}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Risk Distribution (derived from real data) ---- */}
      {history.length > 0 && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-red-500" />
            Risk Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "BLOCK recommendations", count: history.filter((h) => h.recommendation === "BLOCK").length, severity: "high" },
              { label: "Enhanced Due Diligence", count: history.filter((h) => h.recommendation === "ENHANCED_DUE_DILIGENCE").length, severity: "medium" },
              { label: "Standard Processing", count: history.filter((h) => h.recommendation === "STANDARD").length, severity: "low" },
              { label: "Cleared", count: cleared, severity: "clear" },
            ].map((ind) => (
              <div
                key={ind.label}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileWarning className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{ind.label}</span>
                </div>
                <span className="text-sm font-bold font-mono">{ind.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Recent Screenings History ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold">Recent Screenings</h3>
        </div>
        {historyLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No screenings yet. Use the form above to screen an entity against sanctions lists.
          </div>
        ) : (
          <div className="divide-y">
            {history.map((h) => {
              const style = REC_STYLES[h.recommendation];
              return (
                <div key={h.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{h.entityName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {h.entityType}
                      {h.countryCode ? ` \u00b7 ${h.countryCode}` : ""}
                      {" \u00b7 "}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold font-mono ${scoreColor(h.compositeScore)}`}>
                      {h.compositeScore}
                    </span>
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
        )}
      </div>
    </div>
  );
}
