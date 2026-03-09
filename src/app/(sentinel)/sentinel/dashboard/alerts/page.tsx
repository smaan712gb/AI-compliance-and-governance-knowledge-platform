"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertData {
  lastIngestion: {
    sourcesProcessed: number;
    sourcesFailed: number;
    itemsFetched: number;
    itemsNew: number;
    itemsDuplicate: number;
    durationMs: number;
    errors: { sourceId: string; error: string }[];
  } | null;
  spikes: {
    keyword: string;
    currentCount: number;
    baselineAvg: number;
    ratio: number;
    sources: string[];
    severity: string;
  }[];
  convergences: {
    countryCode: string;
    eventTypes: string[];
    eventCount: number;
    severity: string;
  }[];
  sourceHealth: {
    sourceId: string;
    sourceName: string;
    category: string;
    status: "fresh" | "stale" | "very_stale" | "no_data" | "error";
    lastFetched: string | null;
    errorMessage: string | null;
  }[];
  intelligenceGaps: {
    category: string;
    sourceCount: number;
    freshCount: number;
    staleCount: number;
    missingCount: number;
    status: "covered" | "partial" | "gap";
  }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

const SOURCE_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  fresh: { dot: "bg-green-500", label: "Fresh" },
  stale: { dot: "bg-yellow-500", label: "Stale" },
  very_stale: { dot: "bg-red-500", label: "Very Stale" },
  no_data: { dot: "bg-gray-400", label: "No Data" },
  error: { dot: "bg-red-600", label: "Error" },
};

const GAP_STYLES: Record<string, string> = {
  covered: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  gap: "bg-red-100 text-red-800",
};

const REFRESH_INTERVAL_MS = 60_000;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlertsDashboardPage() {
  const [data, setData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/sentinel/ingest");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      setData(json.data ?? json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch alert data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* initial load + auto-refresh */
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ---- derived stats ---- */
  const totalAlerts = (data?.spikes.length ?? 0) + (data?.convergences.length ?? 0);
  const criticalCount =
    (data?.spikes.filter((s) => s.severity === "critical").length ?? 0) +
    (data?.convergences.filter((c) => c.severity === "critical").length ?? 0);
  const totalSources = data?.sourceHealth?.length ?? 0;
  const healthySources = data?.sourceHealth?.filter((s) => s.status === "fresh").length ?? 0;
  const healthyPct = totalSources > 0 ? Math.round((healthySources / totalSources) * 100) : 0;

  /* ================================================================ */
  /*  Loading state                                                    */
  /* ================================================================ */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading alerts...</span>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Error state                                                      */
  /* ================================================================ */
  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Alerts &amp; Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time intelligence alerts and source health
          </p>
        </div>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
          <span className="text-3xl mb-3 block">!!!</span>
          <p className="text-destructive font-medium mb-1">Failed to load alert data</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Main render                                                      */
  /* ================================================================ */
  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alerts &amp; Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time intelligence alerts and source health
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {refreshing ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>

      {/* ---- Error banner (non-blocking, data still shown) ---- */}
      {error && data && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Last refresh failed: {error}
        </div>
      )}

      {/* ---- Summary Stats Bar ---- */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg">
              [!]
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold font-mono">{totalAlerts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center text-lg">
              !!
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold font-mono text-red-600">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-mono">
              %
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sources Healthy</p>
              <p className="text-2xl font-bold font-mono">
                {healthyPct}%{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({healthySources}/{totalSources})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Last Ingestion Summary ---- */}
      {data?.lastIngestion && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Last Ingestion Run</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Sources Processed" value={data.lastIngestion.sourcesProcessed} />
            <Stat label="Sources Failed" value={data.lastIngestion.sourcesFailed} warn={data.lastIngestion.sourcesFailed > 0} />
            <Stat label="Items Fetched" value={data.lastIngestion.itemsFetched} />
            <Stat label="New Items" value={data.lastIngestion.itemsNew} />
            <Stat label="Duration" value={`${(data.lastIngestion.durationMs / 1000).toFixed(1)}s`} />
          </div>
          {data.lastIngestion.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-600 mb-2">
                Errors ({data.lastIngestion.errors.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {data.lastIngestion.errors.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 text-red-700 rounded px-3 py-2 font-mono">
                    <span className="font-bold">{e.sourceId}</span>: {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Active Alerts: Keyword Spikes ---- */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">^</span>
            <h2 className="text-lg font-semibold">Keyword Spikes</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {data?.spikes.length ?? 0} detected
          </span>
        </div>
        {(!data?.spikes || data.spikes.length === 0) ? (
          <EmptyState message="No keyword spikes detected" />
        ) : (
          <div className="divide-y">
            {data.spikes.map((spike, i) => (
              <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                        SEVERITY_STYLES[spike.severity] ?? SEVERITY_STYLES.info
                      }`}
                    >
                      {spike.severity.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm">{spike.keyword}</span>
                  </div>
                  <span className="text-sm font-mono font-bold">
                    {spike.ratio.toFixed(1)}x
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Current: {spike.currentCount}</span>
                  <span>Baseline avg: {spike.baselineAvg.toFixed(1)}</span>
                  <span>Sources: {spike.sources.join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Active Alerts: Geographic Convergences ---- */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">@</span>
            <h2 className="text-lg font-semibold">Geographic Convergences</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {data?.convergences.length ?? 0} detected
          </span>
        </div>
        {(!data?.convergences || data.convergences.length === 0) ? (
          <EmptyState message="No geographic convergences detected" />
        ) : (
          <div className="divide-y">
            {data.convergences.map((conv, i) => (
              <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                        SEVERITY_STYLES[conv.severity] ?? SEVERITY_STYLES.info
                      }`}
                    >
                      {conv.severity.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm font-mono">{conv.countryCode}</span>
                  </div>
                  <span className="text-sm font-mono font-bold">
                    {conv.eventCount} events
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {conv.eventTypes.map((et) => (
                    <span key={et} className="text-xs bg-muted px-2 py-0.5 rounded">
                      {et}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Source Health Grid ---- */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">&gt;</span>
            <h2 className="text-lg font-semibold">Source Health</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(SOURCE_STATUS_STYLES).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${val.dot}`} />
                {val.label}
              </span>
            ))}
          </div>
        </div>
        {(!data?.sourceHealth || data.sourceHealth.length === 0) ? (
          <EmptyState message="No source health data available" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-5">
            {data.sourceHealth.map((src) => {
              const style = SOURCE_STATUS_STYLES[src.status] ?? SOURCE_STATUS_STYLES.no_data;
              return (
                <div
                  key={src.sourceId}
                  className="rounded-md border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate mr-2">
                      {src.sourceName}
                    </span>
                    <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.dot}`} title={style.label} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="inline-block bg-muted px-1.5 py-0.5 rounded mr-2">
                      {src.category}
                    </span>
                    {src.lastFetched ? (
                      <span>
                        Last: {new Date(src.lastFetched).toLocaleDateString()}{" "}
                        {new Date(src.lastFetched).toLocaleTimeString()}
                      </span>
                    ) : (
                      <span className="italic">Never fetched</span>
                    )}
                  </div>
                  {src.errorMessage && (
                    <p className="text-xs text-red-600 mt-1 truncate" title={src.errorMessage}>
                      {src.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Intelligence Gaps ---- */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">?</span>
            <h2 className="text-lg font-semibold">Intelligence Gaps</h2>
          </div>
        </div>
        {(!data?.intelligenceGaps || data.intelligenceGaps.length === 0) ? (
          <EmptyState message="No intelligence gap analysis available" />
        ) : (
          <div className="divide-y">
            {data.intelligenceGaps.map((gap) => (
              <div key={gap.category} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        GAP_STYLES[gap.status] ?? GAP_STYLES.gap
                      }`}
                    >
                      {gap.status.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm">{gap.category}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span>Total: {gap.sourceCount}</span>
                  <span className="text-green-600">Fresh: {gap.freshCount}</span>
                  <span className="text-yellow-600">Stale: {gap.staleCount}</span>
                  <span className="text-red-600">Missing: {gap.missingCount}</span>
                </div>
                {/* coverage bar */}
                <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  {gap.sourceCount > 0 && (
                    <>
                      <div
                        className="h-full bg-green-500 float-left"
                        style={{ width: `${(gap.freshCount / gap.sourceCount) * 100}%` }}
                      />
                      <div
                        className="h-full bg-yellow-500 float-left"
                        style={{ width: `${(gap.staleCount / gap.sourceCount) * 100}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-lg font-bold font-mono ${warn ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}
