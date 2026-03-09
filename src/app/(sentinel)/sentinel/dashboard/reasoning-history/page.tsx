"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  BarChart3,
  Globe,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ---- Types ----

interface Classification {
  category?: string;
  severity?: string;
  riskScore?: number;
}

interface ReasoningEntry {
  id: string;
  headline: string;
  countryCode: string | null;
  category: string;
  inputContext: string;
  reasoningChain: string;
  classification: Classification;
  predictedOutcome: string | null;
  actualOutcome: string | null;
  forecastAccuracy: number | null;
  biasAudit: Record<string, unknown> | null;
  tokens: number;
  latencyMs: number;
  createdAt: string;
}

interface PaginatedHistory {
  entries: ReasoningEntry[];
  total: number;
  page: number;
  limit: number;
}

interface Stats {
  totalCalls: number;
  byCategory: Record<string, number>;
  avgRiskScore: number;
  forecastAccuracy: {
    totalForecasts: number;
    forecastsWithOutcomes: number;
    averageAccuracy: number | null;
  };
  topCountries: { countryCode: string; count: number }[];
}

interface Precedent {
  id: string;
  headline: string;
  countryCode: string | null;
  category: string;
  classification: Classification;
  predictedOutcome: string | null;
  actualOutcome: string | null;
  forecastAccuracy: number | null;
  createdAt: string;
  relevanceScore: number;
}

// ---- Constants ----

const CATEGORIES = [
  "CONFLICT",
  "TERRORISM",
  "CYBER",
  "ECONOMIC",
  "POLITICAL",
  "DISASTER",
  "SANCTIONS",
  "OTHER",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  CONFLICT: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  TERRORISM: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  CYBER: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  ECONOMIC: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  POLITICAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  DISASTER: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  SANCTIONS: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-blue-600 dark:text-blue-400",
  info: "text-gray-500 dark:text-gray-400",
};

// ---- Component ----

export default function ReasoningHistoryPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<PaginatedHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [countryCode, setCountryCode] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Expanded entry
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Outcome form
  const [outcomeEntryId, setOutcomeEntryId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeAccuracy, setOutcomeAccuracy] = useState("0.5");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // Precedents
  const [precedents, setPrecedents] = useState<Precedent[] | null>(null);
  const [precedentsFor, setPrecedentsFor] = useState<string | null>(null);
  const [loadingPrecedents, setLoadingPrecedents] = useState(false);

  // ---- Fetch Stats ----
  useEffect(() => {
    fetch("/api/sentinel/reasoning-history?view=stats")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setStats(data.data);
      })
      .catch(() => {});
  }, []);

  // ---- Fetch History ----
  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (countryCode) params.set("countryCode", countryCode.toUpperCase());
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "15");

    fetch(`/api/sentinel/reasoning-history?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data?.data) setHistory(data.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [countryCode, category, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ---- Record Outcome ----
  const handleSubmitOutcome = async (entryId: string) => {
    setSubmittingOutcome(true);
    try {
      const res = await fetch(`/api/sentinel/reasoning-history/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualOutcome: outcomeText,
          forecastAccuracy: parseFloat(outcomeAccuracy),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save outcome");
      }

      // Refresh
      setOutcomeEntryId(null);
      setOutcomeText("");
      setOutcomeAccuracy("0.5");
      fetchHistory();
    } catch {
      // Error handling — stays visible in the form context
    } finally {
      setSubmittingOutcome(false);
    }
  };

  // ---- Find Precedents ----
  const handleFindPrecedents = async (entry: ReasoningEntry) => {
    if (precedentsFor === entry.id) {
      setPrecedentsFor(null);
      setPrecedents(null);
      return;
    }

    setLoadingPrecedents(true);
    setPrecedentsFor(entry.id);
    setPrecedents(null);

    try {
      const params = new URLSearchParams();
      params.set("headline", entry.headline);
      if (entry.countryCode) params.set("countryCode", entry.countryCode);
      if (entry.category) params.set("category", entry.category);

      const res = await fetch(
        `/api/sentinel/reasoning-history?view=precedents&${params.toString()}`
      );

      if (!res.ok) {
        // Fall back: the precedents endpoint may not exist as a separate view.
        // We'll handle this gracefully.
        setPrecedents([]);
        return;
      }

      const data = await res.json();
      setPrecedents(data?.data ?? []);
    } catch {
      setPrecedents([]);
    } finally {
      setLoadingPrecedents(false);
    }
  };

  // ---- Helpers ----
  const totalPages = history
    ? Math.max(1, Math.ceil(history.total / history.limit))
    : 1;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600 dark:text-red-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return "text-emerald-600 dark:text-emerald-400";
    if (accuracy >= 0.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // ---- Loading State ----
  if (loading && !history) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-emerald-500" />
          Reasoning History
        </h1>
        <p className="text-muted-foreground">
          Historical reasoning outputs, forecast accuracy tracking, and
          escalation pattern detection
        </p>
      </div>

      {/* ---- Stats Bar ---- */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Brain className="h-3.5 w-3.5" />
              Total Calls
            </div>
            <div className="text-2xl font-bold font-mono">
              {stats.totalCalls.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Avg Risk Score
            </div>
            <div
              className={`text-2xl font-bold font-mono ${getRiskColor(stats.avgRiskScore)}`}
            >
              {stats.avgRiskScore}
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Target className="h-3.5 w-3.5" />
              Forecast Accuracy
            </div>
            <div className="text-2xl font-bold font-mono">
              {stats.forecastAccuracy.averageAccuracy !== null
                ? `${(stats.forecastAccuracy.averageAccuracy * 100).toFixed(1)}%`
                : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.forecastAccuracy.forecastsWithOutcomes} /{" "}
              {stats.forecastAccuracy.totalForecasts} recorded
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Globe className="h-3.5 w-3.5" />
              Top Country
            </div>
            <div className="text-2xl font-bold font-mono">
              {stats.topCountries.length > 0
                ? stats.topCountries[0].countryCode
                : "---"}
            </div>
            {stats.topCountries.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {stats.topCountries[0].count} analyses
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Filter Bar ---- */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Country Code
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value.slice(0, 2));
                setPage(1);
              }}
              placeholder="US, UA..."
              maxLength={2}
              className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setCountryCode("");
            setCategory("");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
          className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
      </div>

      {/* ---- Error ---- */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ---- History Table ---- */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">
              {history?.total ?? 0} Reasoning Entries
            </span>
          </div>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          )}
        </div>

        {history && history.entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reasoning entries found</p>
            <p className="text-xs mt-1">
              Entries are created when you analyze events through the reasoning engine
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {history?.entries.map((entry) => {
              const cls = entry.classification ?? {};
              const riskScore =
                typeof cls.riskScore === "number" ? cls.riskScore : null;
              const severity = cls.severity ?? null;
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id}>
                  {/* Row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.id)
                    }
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.headline}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.OTHER
                          }`}
                        >
                          {entry.category}
                        </span>
                        {entry.countryCode && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.countryCode}
                          </span>
                        )}
                        {severity && (
                          <span
                            className={`text-xs font-medium ${
                              SEVERITY_COLORS[severity] ?? ""
                            }`}
                          >
                            {severity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Risk score */}
                    {riskScore !== null && (
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-lg font-bold font-mono ${getRiskColor(riskScore)}`}
                        >
                          {riskScore}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          risk
                        </div>
                      </div>
                    )}

                    {/* Accuracy */}
                    <div className="text-right flex-shrink-0 w-16">
                      {entry.forecastAccuracy !== null ? (
                        <>
                          <div
                            className={`text-sm font-bold font-mono ${getAccuracyColor(
                              entry.forecastAccuracy
                            )}`}
                          >
                            {(entry.forecastAccuracy * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            accuracy
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">
                          ---
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground flex-shrink-0 w-28 text-right hidden sm:block">
                      {formatDate(entry.createdAt)}
                    </div>

                    {/* Expand icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                      {/* Reasoning Chain */}
                      <div className="pt-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Reasoning Chain
                        </h4>
                        <div className="text-sm whitespace-pre-wrap bg-background rounded-md border p-3 max-h-64 overflow-y-auto">
                          {entry.reasoningChain}
                        </div>
                      </div>

                      {/* Predicted vs Actual */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Predicted Outcome
                          </h4>
                          <div className="text-sm bg-background rounded-md border p-3">
                            {entry.predictedOutcome ?? (
                              <span className="text-muted-foreground italic">
                                No prediction recorded
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Actual Outcome
                          </h4>
                          <div className="text-sm bg-background rounded-md border p-3">
                            {entry.actualOutcome ? (
                              <div>
                                <p>{entry.actualOutcome}</p>
                                {entry.forecastAccuracy !== null && (
                                  <p
                                    className={`mt-2 font-semibold ${getAccuracyColor(
                                      entry.forecastAccuracy
                                    )}`}
                                  >
                                    <CheckCircle className="inline h-3.5 w-3.5 mr-1" />
                                    Accuracy: {(entry.forecastAccuracy * 100).toFixed(0)}%
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Not yet recorded
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Tokens: {entry.tokens.toLocaleString()}</span>
                        <span>Latency: {entry.latencyMs}ms</span>
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {/* Record Outcome button */}
                        {!entry.actualOutcome && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOutcomeEntryId(
                                outcomeEntryId === entry.id
                                  ? null
                                  : entry.id
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Record Outcome
                          </button>
                        )}

                        {/* Find Precedents button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFindPrecedents(entry);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          <Search className="h-3.5 w-3.5" />
                          {precedentsFor === entry.id
                            ? "Hide Precedents"
                            : "Find Precedents"}
                        </button>
                      </div>

                      {/* Outcome Form */}
                      {outcomeEntryId === entry.id && (
                        <div className="rounded-md border bg-background p-4 space-y-3">
                          <h4 className="text-sm font-semibold">
                            Record What Actually Happened
                          </h4>
                          <textarea
                            value={outcomeText}
                            onChange={(e) => setOutcomeText(e.target.value)}
                            placeholder="Describe the actual outcome..."
                            rows={3}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                          />
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Forecast Accuracy: {outcomeAccuracy} (0 = wrong,
                              1 = perfect)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={outcomeAccuracy}
                              onChange={(e) =>
                                setOutcomeAccuracy(e.target.value)
                              }
                              className="w-full accent-emerald-600"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Completely Wrong</span>
                              <span>Partially Correct</span>
                              <span>Perfectly Accurate</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={
                                !outcomeText.trim() || submittingOutcome
                              }
                              onClick={() => handleSubmitOutcome(entry.id)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {submittingOutcome && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              Save Outcome
                            </button>
                            <button
                              onClick={() => {
                                setOutcomeEntryId(null);
                                setOutcomeText("");
                                setOutcomeAccuracy("0.5");
                              }}
                              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Precedents Panel */}
                      {precedentsFor === entry.id && (
                        <div className="rounded-md border bg-background p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                            <Search className="h-3.5 w-3.5 text-emerald-500" />
                            Similar Precedents
                          </h4>
                          {loadingPrecedents ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Searching historical data...
                            </div>
                          ) : precedents && precedents.length > 0 ? (
                            <div className="space-y-3">
                              {precedents.map((p) => {
                                const pCls =
                                  (p.classification as Classification) ?? {};
                                return (
                                  <div
                                    key={p.id}
                                    className="rounded border p-3 text-sm"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium">
                                          {p.headline}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              CATEGORY_COLORS[p.category] ??
                                              CATEGORY_COLORS.OTHER
                                            }`}
                                          >
                                            {p.category}
                                          </span>
                                          {p.countryCode && (
                                            <span className="text-xs font-mono text-muted-foreground">
                                              {p.countryCode}
                                            </span>
                                          )}
                                          <span className="text-xs text-muted-foreground">
                                            {formatDate(p.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-muted-foreground">
                                          Relevance
                                        </div>
                                        <div className="text-sm font-bold font-mono text-emerald-600">
                                          {p.relevanceScore}
                                        </div>
                                      </div>
                                    </div>
                                    {(p.predictedOutcome ||
                                      p.actualOutcome) && (
                                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                        {p.predictedOutcome && (
                                          <p>
                                            <strong>Predicted:</strong>{" "}
                                            {p.predictedOutcome}
                                          </p>
                                        )}
                                        {p.actualOutcome && (
                                          <p>
                                            <strong>Actual:</strong>{" "}
                                            {p.actualOutcome}
                                          </p>
                                        )}
                                        {p.forecastAccuracy !== null && (
                                          <p
                                            className={getAccuracyColor(
                                              p.forecastAccuracy
                                            )}
                                          >
                                            Accuracy:{" "}
                                            {(
                                              p.forecastAccuracy * 100
                                            ).toFixed(0)}
                                            %
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {typeof pCls.riskScore === "number" && (
                                      <div className="mt-1 text-xs">
                                        <span className="text-muted-foreground">
                                          Risk:{" "}
                                        </span>
                                        <span
                                          className={`font-mono font-bold ${getRiskColor(
                                            pCls.riskScore
                                          )}`}
                                        >
                                          {pCls.riskScore}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No similar precedents found
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Pagination ---- */}
      {history && history.total > history.limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {history.page} of {totalPages} ({history.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border p-1.5 hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(
                1,
                Math.min(page - 2, totalPages - 4)
              );
              const pageNum = startPage + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    pageNum === page
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "hover:bg-accent"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border p-1.5 hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
