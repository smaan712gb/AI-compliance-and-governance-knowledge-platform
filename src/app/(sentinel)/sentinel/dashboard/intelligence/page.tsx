"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Clock,
  Filter,
  RefreshCw,
  ChevronRight,
  Zap,
  X,
  Shield,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IntelligenceEvent {
  id: string;
  headline: string;
  summary: string;
  source: string;
  sourceUrl: string | null;
  category: string;
  severity: string;
  countryCode: string | null;
  riskScore: number;
  entities: string[];
  processedAt: string;
}

interface ReasoningResult {
  reasoning: {
    category: string;
    severity: string;
    riskScore: number;
    reasoning: {
      whatHappened: string;
      whyItMatters: string;
      whatHappensNext: string;
      whoIsAffected: string;
    };
    impactAnalysis: {
      primaryImpact: string;
      secondOrderEffects: string[];
      affectedSectors: string[];
      affectedCountries: string[];
    };
    actionableInsights: string[];
    entities: string[];
    reasoningTokens: number;
  };
  biasAudit: {
    hasBias: boolean;
    confidence: number;
    biasType: string | null;
    explanation: string;
    recommendation: string;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_COLORS: Record<string, string> = {
  SENTINEL_CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SENTINEL_HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SENTINEL_MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SENTINEL_LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  INFO: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300",
};

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  CONFLICT: Shield,
  TERRORISM: AlertTriangle,
  CYBER: Zap,
  ECONOMIC: TrendingUp,
  POLITICAL: Globe,
  DISASTER: Activity,
  SANCTIONS: Shield,
};

function normalizeSeverity(s: string): string {
  return s.replace("SENTINEL_", "").toLowerCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IntelligencePage() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Analysis state
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReasoningResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/sentinel/intelligence?limit=100");
      const data = await res.json();
      if (data?.data) setEvents(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter events
  const filtered = events.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (severityFilter !== "all" && normalizeSeverity(e.severity) !== severityFilter) return false;
    return true;
  });

  // Stats
  const categories = [...new Set(events.map((e) => e.category))];
  const criticalCount = events.filter((e) =>
    e.severity === "SENTINEL_CRITICAL" || e.severity === "SENTINEL_HIGH"
  ).length;

  // Analyze an event with AI
  async function handleAnalyze(event: IntelligenceEvent) {
    setSelectedEvent(event);
    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError("");

    try {
      const res = await fetch("/api/sentinel/reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: event.headline,
          content: event.summary,
          source: event.source,
          countryCode: event.countryCode || undefined,
          includeBiasAudit: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error || "Analysis failed");
        return;
      }
      setAnalysisResult(data.data);
    } catch {
      setAnalysisError("Network error. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading intelligence feed...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-emerald-500" />
            Intelligence Feed
          </h1>
          <p className="text-muted-foreground">
            Live intelligence events with one-click AI reasoning analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold font-mono">{events.length}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className={`text-2xl font-bold font-mono ${criticalCount > 0 ? "text-red-500" : ""}`}>
            {criticalCount}
          </p>
          <p className="text-xs text-muted-foreground">Critical / High</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold font-mono">{categories.length}</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold font-mono">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Filtered Results</p>
        </div>
      </div>

      {/* ---- Analysis Panel (slides in when event selected) ---- */}
      {selectedEvent && (
        <div className="rounded-lg border-2 border-emerald-500/50 bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-500" />
                AI Analysis
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedEvent.headline}</p>
            </div>
            <button
              onClick={() => { setSelectedEvent(null); setAnalysisResult(null); }}
              className="rounded-md p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {analyzing && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="text-sm text-muted-foreground">Running AI reasoning analysis...</span>
            </div>
          )}

          {analysisError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {analysisError}
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  SEVERITY_COLORS[("SENTINEL_" + analysisResult.reasoning.severity).toUpperCase()] ||
                  SEVERITY_COLORS.INFO
                }`}>
                  {analysisResult.reasoning.severity.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">{analysisResult.reasoning.category}</span>
                <span className="ml-auto text-2xl font-bold font-mono">{analysisResult.reasoning.riskScore}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "What Happened", text: analysisResult.reasoning.reasoning.whatHappened },
                  { label: "Why It Matters", text: analysisResult.reasoning.reasoning.whyItMatters },
                  { label: "What Happens Next", text: analysisResult.reasoning.reasoning.whatHappensNext },
                  { label: "Who Is Affected", text: analysisResult.reasoning.reasoning.whoIsAffected },
                ].map((item) => (
                  <div key={item.label} className="rounded-md bg-muted/50 p-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </h4>
                    <p className="text-sm">{item.text}</p>
                  </div>
                ))}
              </div>

              {analysisResult.reasoning.actionableInsights.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Actionable Insights</h4>
                  <ul className="space-y-1">
                    {analysisResult.reasoning.actionableInsights.map((insight, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.biasAudit && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground border-t pt-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    analysisResult.biasAudit.hasBias ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                  }`}>
                    {analysisResult.biasAudit.hasBias ? "BIAS DETECTED" : "NO BIAS"}
                  </span>
                  <span>Confidence: {Math.round(analysisResult.biasAudit.confidence * 100)}%</span>
                  <span className="ml-auto">{analysisResult.reasoning.reasoningTokens} tokens</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Event Feed ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Live Events
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {events.length === 0
              ? "No intelligence events yet. Events will appear as the RSS feed ingestion pipeline processes data."
              : "No events match the selected filters."}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.slice(0, 50).map((event) => {
              const sev = normalizeSeverity(event.severity);
              const CategoryIcon = CATEGORY_ICONS[event.category] || Activity;
              return (
                <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold capitalize ${
                          SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.INFO
                        }`}>
                          {sev}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          <CategoryIcon className="h-3 w-3" />
                          {event.category.replace(/_/g, " ")}
                        </span>
                        {event.countryCode && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            {event.countryCode}
                          </span>
                        )}
                        {event.riskScore > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Risk: {event.riskScore}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold">{event.headline}</p>
                      {event.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {event.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(event.processedAt)}
                        </span>
                        {event.entities.length > 0 && (
                          <span className="hidden sm:inline">
                            {event.entities.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyze(event)}
                      disabled={analyzing && selectedEvent?.id === event.id}
                      className="flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {analyzing && selectedEvent?.id === event.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Brain className="h-3.5 w-3.5" />
                      )}
                      Analyze
                    </button>
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
