"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  ShieldAlert,
  Brain,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Zap,
  Target,
  Truck,
  FileSearch,
  RefreshCw,
  Loader2,
  Flame,
  Eye,
  Shield,
  Activity,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardData {
  metrics: {
    eventsLast24h: number;
    eventsTotal: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    aiAnalyses24h: number;
    aiAnalysesTotal: number;
    openCases: number;
    supplyChainAlerts: number;
  };
  topThreats: {
    id: string;
    headline: string;
    category: string;
    severity: string;
    countryCode: string | null;
    riskScore: number;
    source: string | null;
    processedAt: string;
  }[];
  categories: { category: string; count: number }[];
  recentReasoning: {
    id: string;
    headline: string;
    category: string;
    classification: { severity: string; riskScore: number } | null;
    predictedOutcome: string | null;
    createdAt: string;
    countryCode: string | null;
  }[];
  countryHotspots: { countryCode: string; eventCount: number }[];
  supplyChainAlerts: {
    id: string;
    alertType: string;
    riskChange: number;
    newRiskScore: number;
    impactSummary: string;
    createdAt: string;
    supplier: { name: string; countryCode: string };
  }[];
  recentTriage: {
    id: string;
    stagesCompleted: string[];
    crisisScore: number | null;
    durationMs: number;
    createdAt: string;
    event: { headline: string; severity: string; countryCode: string | null };
  }[];
  caseStats: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEV_STYLES: Record<string, string> = {
  SENTINEL_CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SENTINEL_HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SENTINEL_MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SENTINEL_LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const CAT_ICONS: Record<string, typeof AlertTriangle> = {
  CONFLICT: Target,
  TERRORISM: ShieldAlert,
  CYBER: Shield,
  ECONOMIC: TrendingUp,
  POLITICAL: Globe,
  DISASTER: Flame,
  SANCTIONS: ShieldAlert,
};

function sevLabel(s: string) {
  return s.replace("SENTINEL_", "").toLowerCase();
}

function riskColor(score: number) {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-amber-500";
  return "text-green-500";
}

function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SentinelDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/sentinel/dashboard");
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading intelligence command center...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">Failed to load dashboard data.</div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-500" />
            Intelligence Command Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Live intelligence overview — auto-updated by 7-stage AI pipeline
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ---- Hero Metrics ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Critical</span>
          </div>
          <p className="text-3xl font-bold font-mono">{m.criticalAlerts}</p>
          <p className="text-xs text-muted-foreground">last 24h</p>
        </div>
        <div className="rounded-lg border p-4 bg-orange-50 dark:bg-orange-950/30">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">High</span>
          </div>
          <p className="text-3xl font-bold font-mono">{m.highAlerts}</p>
          <p className="text-xs text-muted-foreground">last 24h</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">Events</span>
          </div>
          <p className="text-3xl font-bold font-mono">{m.eventsLast24h}</p>
          <p className="text-xs text-muted-foreground">last 24h ({m.eventsTotal} total)</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium">AI Analyses</span>
          </div>
          <p className="text-3xl font-bold font-mono">{m.aiAnalyses24h}</p>
          <p className="text-xs text-muted-foreground">last 24h ({m.aiAnalysesTotal} total)</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileSearch className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium">Open Cases</span>
          </div>
          <p className="text-3xl font-bold font-mono">{m.openCases}</p>
          <p className="text-xs text-muted-foreground">
            {m.supplyChainAlerts > 0 && <span className="text-red-500">{m.supplyChainAlerts} supply chain alerts</span>}
          </p>
        </div>
      </div>

      {/* ---- Two Column: Top Threats + AI Insights ---- */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top Threats — 3 cols */}
        <div className="lg:col-span-3 rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Top Threats — Last 24h
            </h2>
            <Link href="/sentinel/dashboard/intelligence" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.topThreats.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No critical or high severity events in the last 24 hours.
            </div>
          ) : (
            <div className="divide-y">
              {data.topThreats.map((threat) => {
                const CatIcon = CAT_ICONS[threat.category] || AlertTriangle;
                return (
                  <div key={threat.id} className="p-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <CatIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold capitalize ${SEV_STYLES[threat.severity] || ""}`}>
                            {sevLabel(threat.severity)}
                          </span>
                          <span className={`text-xs font-bold font-mono ${riskColor(threat.riskScore)}`}>
                            {threat.riskScore}
                          </span>
                          {threat.countryCode && (
                            <span className="text-xs font-mono text-muted-foreground">{threat.countryCode}</span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {timeAgo(threat.processedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-tight">{threat.headline}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insights — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Reasoning Highlights */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-500" />
                AI Predictions
              </h2>
              <Link href="/sentinel/dashboard/reasoning-history" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                History <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentReasoning.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                AI reasoning runs automatically on high-impact events.
              </div>
            ) : (
              <div className="divide-y">
                {data.recentReasoning.map((r) => (
                  <div key={r.id} className="p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      {r.countryCode && (
                        <span className="text-xs font-mono text-muted-foreground">{r.countryCode}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-xs font-medium leading-tight mb-1">{r.headline.slice(0, 120)}</p>
                    {r.predictedOutcome && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1.5 leading-relaxed">
                        <Eye className="h-3 w-3 inline mr-1" />
                        {r.predictedOutcome.slice(0, 200)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supply Chain Alerts */}
          {data.supplyChainAlerts.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Supply Chain Alerts
                </h2>
                <Link href="/sentinel/dashboard/supply-chain" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y">
                {data.supplyChainAlerts.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-500 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        +{a.riskChange} risk
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{a.supplier.countryCode}</span>
                    </div>
                    <p className="text-xs font-medium">{a.supplier.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.impactSummary.slice(0, 150)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Bottom Row: Categories + Country Hotspots + Triage ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-500" />
            Event Categories (24h)
          </h3>
          {data.categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events in last 24h</p>
          ) : (
            <div className="space-y-2">
              {data.categories.map((c) => {
                const maxCount = data.categories[0]?.count || 1;
                const pct = Math.round((c.count / maxCount) * 100);
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{c.category}</span>
                      <span className="font-mono text-muted-foreground">{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Country Hotspots */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-red-500" />
            Country Hotspots (7d)
          </h3>
          {data.countryHotspots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hotspot data available</p>
          ) : (
            <div className="space-y-2">
              {data.countryHotspots.map((c) => (
                <div key={c.countryCode} className="flex items-center justify-between">
                  <span className="text-sm font-mono font-medium">{c.countryCode}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden w-20">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${Math.min(100, (c.eventCount / (data.countryHotspots[0]?.eventCount || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">{c.eventCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Triage Activity */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            Auto-Triage Activity
          </h3>
          {data.recentTriage.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-2">No triage runs yet.</p>
              <p className="text-xs text-muted-foreground">
                Triage triggers automatically on CRITICAL/HIGH events with risk score 70+.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentTriage.map((t) => (
                <div key={t.id} className="rounded-md border p-3">
                  <p className="text-xs font-medium leading-tight mb-1">
                    {t.event.headline.slice(0, 100)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {t.event.countryCode && <span className="font-mono">{t.event.countryCode}</span>}
                    <span>{t.stagesCompleted.length} stages</span>
                    <span>{t.durationMs}ms</span>
                    <span>{timeAgo(t.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Quick Navigation ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/sentinel/dashboard/intelligence", icon: Target, label: "Intelligence Feed", color: "text-emerald-600" },
          { href: "/sentinel/dashboard/financial-crime", icon: ShieldAlert, label: "Financial Crime", color: "text-red-600" },
          { href: "/sentinel/dashboard/regulatory-radar", icon: Globe, label: "Regulatory Radar", color: "text-blue-600" },
          { href: "/sentinel/dashboard/cases", icon: FileSearch, label: "Cases & Triage", color: "text-purple-600" },
        ].map((nav) => (
          <Link key={nav.href} href={nav.href}>
            <div className="rounded-lg border p-4 hover:shadow-md transition-shadow flex items-center gap-3">
              <nav.icon className={`h-5 w-5 ${nav.color}`} />
              <span className="text-sm font-medium">{nav.label}</span>
              <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
