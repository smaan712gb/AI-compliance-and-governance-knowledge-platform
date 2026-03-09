"use client";

import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Severity = "critical" | "high" | "medium" | "low";

interface IntelligenceEvent {
  id: string;
  headline: string;
  summary: string | null;
  category: string;
  severity: string;
  countryCode: string | null;
  source: string | null;
  processedAt: string;
  riskScore: number | null;
}

interface CaseStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: Record<string, number>;
}

interface ScreeningResult {
  id: string;
  entityName: string;
  entityType: string;
  compositeScore: number;
  recommendation: string;
  countryCode: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SENTINEL_CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SENTINEL_HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SENTINEL_MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SENTINEL_LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const CATEGORY_ICONS: Record<string, typeof Banknote> = {
  SANCTIONS: ShieldAlert,
  FINANCIAL_CRIME: Banknote,
  TRADE: Ship,
  FRAUD: Fingerprint,
  REGULATORY: Building2,
  ECONOMIC: CircleDollarSign,
};

function normalizeSeverity(s: string): string {
  return s.replace("SENTINEL_", "").toLowerCase();
}

function riskScoreColor(score: number) {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-amber-500";
  return "text-green-500";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FinancialCrimePage() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [screenings, setScreenings] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [sanctionsRes, casesRes, screeningsRes] = await Promise.all([
        fetch("/api/sentinel/intelligence?category=SANCTIONS&limit=40").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/sentinel/cases?view=stats").then((r) => r.json()).catch(() => ({ data: null })),
        fetch("/api/sentinel/screening?limit=10").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const allEvents = (sanctionsRes.data || [])
        .sort((a: IntelligenceEvent, b: IntelligenceEvent) =>
          new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
        );

      setEvents(allEvents);
      setCaseStats(casesRes.data || null);
      setScreenings(screeningsRes.data || []);
    } catch {
      setError("Failed to load financial crime data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEvents = events.filter((e) => {
    if (severityFilter === "all") return true;
    return normalizeSeverity(e.severity) === severityFilter;
  });

  const criticalCount = events.filter((e) => normalizeSeverity(e.severity) === "critical").length;
  const highCount = events.filter((e) => normalizeSeverity(e.severity) === "high").length;
  const highRiskScreenings = screenings.filter((s) => s.compositeScore >= 70).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading financial crime data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-red-500" />
            Financial Crime Intelligence
          </h1>
          <p className="text-muted-foreground">
            Live fraud signals, suspicious activity monitoring, and screening results
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {criticalCount > 0 && (
              <span className="text-xs font-semibold flex items-center gap-0.5 text-red-500">
                <ArrowUpRight className="h-3 w-3" />
                {criticalCount}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-mono">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Intelligence Events</p>
        </div>
        <div className="rounded-lg border p-4 bg-orange-50 dark:bg-orange-950/30">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{highCount}</p>
          <p className="text-xs text-muted-foreground mt-1">High Severity Signals</p>
        </div>
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{caseStats?.open ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Open Cases</p>
        </div>
        <div className="rounded-lg border p-4 bg-emerald-50 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between mb-2">
            <FileSearch className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{highRiskScreenings}</p>
          <p className="text-xs text-muted-foreground mt-1">High-Risk Screenings</p>
        </div>
      </div>

      {/* ---- Intelligence Event Feed ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Financial Crime &amp; Sanctions Events
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {events.length === 0
              ? "No financial crime events yet. Events will appear as the intelligence feed processes data."
              : "No events match the selected filters."}
          </div>
        ) : (
          <div className="divide-y">
            {filteredEvents.slice(0, 20).map((event) => {
              const sev = normalizeSeverity(event.severity);
              const CatIcon = CATEGORY_ICONS[event.category] || AlertTriangle;
              return (
                <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <CatIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                              SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.medium
                            }`}
                          >
                            {sev}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            {event.category.replace(/_/g, " ")}
                          </span>
                          {event.countryCode && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {event.countryCode}
                            </span>
                          )}
                          {event.riskScore != null && (
                            <span className={`text-xs font-mono font-bold ${riskScoreColor(event.riskScore)}`}>
                              Risk: {event.riskScore}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1">{event.headline}</p>
                        {event.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(event.processedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Recent Screenings ---- */}
      {screenings.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Recent Entity Screenings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Risk Score</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Recommendation</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Country</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {screenings.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.entityName}</td>
                    <td className="px-4 py-3 text-xs capitalize">{s.entityType}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono ${riskScoreColor(s.compositeScore)}`}>
                        {s.compositeScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        s.recommendation === "BLOCK" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        : s.recommendation === "ENHANCED_DUE_DILIGENCE" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : s.recommendation === "CLEAR" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                      }`}>
                        {s.recommendation.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{s.countryCode || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Case Stats ---- */}
      {caseStats && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-500" />
            Investigation Pipeline
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Open</p>
              <p className="text-2xl font-bold font-mono mt-1">{caseStats.open}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">In Progress</p>
              <p className="text-2xl font-bold font-mono mt-1">{caseStats.inProgress}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Resolved</p>
              <p className="text-2xl font-bold font-mono mt-1">{caseStats.resolved}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Closed</p>
              <p className="text-2xl font-bold font-mono mt-1">{caseStats.closed}</p>
            </div>
          </div>
          {caseStats.byPriority && Object.keys(caseStats.byPriority).length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-xs text-muted-foreground">By Priority:</span>
              {Object.entries(caseStats.byPriority).map(([priority, count]) => (
                <span key={priority} className="text-xs">
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    priority === "CRITICAL" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    : priority === "HIGH" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                    : priority === "MEDIUM" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  }`}>
                    {priority}: {count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state if no data at all */}
      {events.length === 0 && screenings.length === 0 && !caseStats && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Fingerprint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Financial Crime Data Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Financial crime intelligence will populate as the Sentinel feed ingests events.
            Use Entity Screening to run sanctions checks, or create Cases from the Cases page.
          </p>
        </div>
      )}
    </div>
  );
}
