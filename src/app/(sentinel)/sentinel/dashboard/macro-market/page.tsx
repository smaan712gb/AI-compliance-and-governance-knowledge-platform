"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Globe,
  Activity,
  Shield,
} from "lucide-react";

/* ---------- Types ---------- */

interface MacroMarketReport {
  timestamp: string;
  overallRiskLevel: "critical" | "elevated" | "moderate" | "low";
  riskScore: number;
  signals: Array<{
    indicator: string;
    value: number;
    change: number;
    changeDirection: "up" | "down" | "flat";
    significance: "critical" | "high" | "medium" | "low";
    geopoliticalContext: string;
  }>;
  commodities: Array<{
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    dayHigh: number;
    dayLow: number;
    geopoliticalRelevance: string;
  }>;
  forex: Array<{
    pair: string;
    price: number;
    change: number;
    changesPercentage: number;
    stabilitySignal: "stable" | "volatile" | "crisis";
  }>;
  sectors: Array<{
    sector: string;
    changesPercentage: number;
    geopoliticalExposure: "high" | "medium" | "low";
  }>;
  treasury: {
    date: string;
    month1: number;
    month6: number;
    year1: number;
    year2: number;
    year5: number;
    year10: number;
    year30: number;
    yieldCurveInverted: boolean;
  } | null;
  fearGreedIndicators: {
    vixLevel: number | null;
    goldOilRatio: number | null;
    yieldSpread: number | null;
  };
}

/* ---------- Colour maps ---------- */

const RISK_LEVEL_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  elevated:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
  moderate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
};

const RISK_BAR_COLOR: Record<string, string> = {
  critical: "bg-red-500",
  elevated: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
};

const SIGNIFICANCE_BORDER: Record<string, string> = {
  critical: "border-red-500",
  high: "border-orange-500",
  medium: "border-yellow-500",
  low: "border-gray-300 dark:border-gray-600",
};

const SIGNIFICANCE_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const STABILITY_BADGE: Record<string, string> = {
  stable: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
  volatile:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200",
  crisis: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
};

const EXPOSURE_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
};

/* ---------- Helpers ---------- */

function pctColor(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function pctPrefix(v: number) {
  return v > 0 ? "+" : "";
}

function ChangeIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up")
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (dir === "down")
    return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function sectorBg(pct: number) {
  const abs = Math.min(Math.abs(pct), 5);
  const intensity = Math.round((abs / 5) * 40 + 10); // 10-50
  if (pct > 0) return `rgba(16,185,129,${intensity / 100})`; // emerald
  if (pct < 0) return `rgba(239,68,68,${intensity / 100})`; // red
  return undefined;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded ${className}`} />
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

/* ---------- Auto-refresh interval ---------- */

const REFRESH_INTERVAL = 300_000; // 5 min

/* ---------- Main Component ---------- */

export default function MacroMarketPage() {
  const [data, setData] = useState<MacroMarketReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tierLimited, setTierLimited] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sentinel/macro-market?section=all");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      const raw = json.data ?? json;
      // Ensure all fields have safe defaults
      const report: MacroMarketReport = {
        timestamp: raw.timestamp || new Date().toISOString(),
        overallRiskLevel: raw.overallRiskLevel || "low",
        riskScore: raw.riskScore ?? 0,
        signals: raw.signals || [],
        commodities: raw.commodities || [],
        forex: raw.forex || [],
        sectors: raw.sectors || [],
        treasury: raw.treasury || null,
        fearGreedIndicators: {
          vixLevel: raw.fearGreedIndicators?.vixLevel ?? null,
          goldOilRatio: raw.fearGreedIndicators?.goldOilRatio ?? null,
          yieldSpread: raw.fearGreedIndicators?.yieldSpread ?? null,
        },
      };
      setData(report);

      // detect tier limitation — check if API returned _restricted field
      const restricted = raw._restricted;
      if (Array.isArray(restricted) && restricted.length > 0) {
        setTierLimited(true);
      } else {
        setTierLimited(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  /* --- Loading --- */
  if (loading) return <LoadingState />;

  /* --- Error --- */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">
          Unable to load market data
        </h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {error || "No data returned from the API."}
        </p>
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const ts = new Date(data.timestamp);
  const formattedTime = ts.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const treasuryKeys: { label: string; key: keyof NonNullable<MacroMarketReport["treasury"]> }[] = [
    { label: "1M", key: "month1" },
    { label: "6M", key: "month6" },
    { label: "1Y", key: "year1" },
    { label: "2Y", key: "year2" },
    { label: "5Y", key: "year5" },
    { label: "10Y", key: "year10" },
    { label: "30Y", key: "year30" },
  ];

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Macro Market Radar</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {formattedTime}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ---- Tier Warning ---- */}
      {tierLimited && (
        <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Limited data on Free tier
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Upgrade to PRO or higher to unlock full market signals,
              commodities, forex, sector heatmaps, and treasury data.
            </p>
          </div>
        </div>
      )}

      {/* ---- Risk Summary Bar ---- */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          {/* Risk Level + Score */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  RISK_LEVEL_BADGE[data.overallRiskLevel] || ""
                }`}
              >
                {data.overallRiskLevel}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <span className="text-2xl font-bold font-mono">
                {data.riskScore}
              </span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    RISK_BAR_COLOR[data.overallRiskLevel] || "bg-gray-500"
                  }`}
                  style={{ width: `${data.riskScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fear & Greed Indicators */}
          <div className="flex items-center gap-6 text-sm">
            {data.fearGreedIndicators.vixLevel != null && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  VIX
                </div>
                <div className="font-mono font-bold text-lg">
                  {data.fearGreedIndicators.vixLevel.toFixed(1)}
                </div>
              </div>
            )}
            {data.fearGreedIndicators.goldOilRatio != null && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Gold/Oil
                </div>
                <div className="font-mono font-bold text-lg">
                  {data.fearGreedIndicators.goldOilRatio.toFixed(2)}
                </div>
              </div>
            )}
            {data.fearGreedIndicators.yieldSpread != null && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Yield Spread
                </div>
                <div
                  className={`font-mono font-bold text-lg ${
                    data.fearGreedIndicators.yieldSpread < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {data.fearGreedIndicators.yieldSpread > 0 ? "+" : ""}
                  {data.fearGreedIndicators.yieldSpread.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Market Signals ---- */}
      {data.signals && data.signals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Market Signals
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.signals.map((sig, i) => (
              <div
                key={`${sig.indicator}-${i}`}
                className={`rounded-lg border-l-4 border bg-card p-4 ${
                  SIGNIFICANCE_BORDER[sig.significance] || ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold truncate pr-2">
                    {sig.indicator}
                  </h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      SIGNIFICANCE_BADGE[sig.significance] || ""
                    }`}
                  >
                    {sig.significance}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-bold font-mono">
                    {typeof sig.value === "number"
                      ? sig.value.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : sig.value}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-sm font-mono ${pctColor(
                      sig.change
                    )}`}
                  >
                    <ChangeIcon dir={sig.changeDirection} />
                    {pctPrefix(sig.change)}
                    {sig.change.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sig.geopoliticalContext}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Commodities Grid ---- */}
      {data.commodities && data.commodities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Commodities
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.commodities.map((c) => (
              <div
                key={c.symbol}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    {c.symbol}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xl font-bold font-mono">
                    ${c.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`text-sm font-mono font-medium ${pctColor(
                      c.changesPercentage
                    )}`}
                  >
                    {pctPrefix(c.changesPercentage)}
                    {c.changesPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2 font-mono">
                  H {c.dayHigh.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {" / "}
                  L {c.dayLow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {c.geopoliticalRelevance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Forex Monitor ---- */}
      {data.forex && data.forex.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Forex Monitor
            </h2>
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-3 font-semibold">Pair</th>
                  <th className="text-right p-3 font-semibold">Rate</th>
                  <th className="text-right p-3 font-semibold">Change</th>
                  <th className="text-right p-3 font-semibold">Change %</th>
                  <th className="text-center p-3 font-semibold">Stability</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.forex.map((fx) => (
                  <tr
                    key={fx.pair}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3 font-medium font-mono">{fx.pair}</td>
                    <td className="p-3 text-right font-mono">
                      {fx.price.toFixed(4)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono ${pctColor(
                        fx.change
                      )}`}
                    >
                      {pctPrefix(fx.change)}
                      {fx.change.toFixed(4)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono ${pctColor(
                        fx.changesPercentage
                      )}`}
                    >
                      {pctPrefix(fx.changesPercentage)}
                      {fx.changesPercentage.toFixed(2)}%
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          STABILITY_BADGE[fx.stabilitySignal] || ""
                        }`}
                      >
                        {fx.stabilitySignal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Sector Heatmap ---- */}
      {data.sectors && data.sectors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Sector Heatmap
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.sectors.map((s) => (
              <div
                key={s.sector}
                className="rounded-lg border bg-card p-4 transition-colors"
                style={{ backgroundColor: sectorBg(s.changesPercentage) }}
              >
                <h3 className="text-sm font-semibold mb-1 truncate">
                  {s.sector}
                </h3>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-lg font-bold font-mono ${pctColor(
                      s.changesPercentage
                    )}`}
                  >
                    {pctPrefix(s.changesPercentage)}
                    {s.changesPercentage.toFixed(2)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      EXPOSURE_BADGE[s.geopoliticalExposure] || ""
                    }`}
                  >
                    {s.geopoliticalExposure}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Treasury Yield Curve ---- */}
      {data.treasury && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Treasury Yield Curve
            </h2>
            {data.treasury.yieldCurveInverted && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200">
                <AlertTriangle className="h-3 w-3" />
                Inverted
              </span>
            )}
          </div>
          <div className="rounded-lg border bg-card p-5">
            {/* Date */}
            <p className="text-xs text-muted-foreground mb-4">
              As of {data.treasury.date}
            </p>

            {/* Rate numbers row */}
            <div className="flex items-end justify-between gap-2 mb-2">
              {treasuryKeys.map(({ label, key }) => {
                const val = data.treasury![key] as number;
                return (
                  <div key={label} className="flex-1 text-center min-w-0">
                    <div className="text-sm font-bold font-mono">
                      {val.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simple bar chart */}
            <div className="flex items-end justify-between gap-2 h-32 mt-4 border-b border-l pl-1 pb-1">
              {treasuryKeys.map(({ label, key }) => {
                const val = data.treasury![key] as number;
                // Scale: max bar height if rate is ~6%, min if 0
                const maxRate = 6;
                const heightPct = Math.max(
                  5,
                  Math.min(100, (val / maxRate) * 100)
                );
                const is2Y = key === "year2";
                const is10Y = key === "year10";
                const inverted = data.treasury!.yieldCurveInverted;
                let barColor = "bg-emerald-500";
                if (inverted && (is2Y || is10Y)) barColor = "bg-red-500";

                return (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <div
                      className={`w-full max-w-[40px] rounded-t ${barColor} transition-all`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Labels below bars */}
            <div className="flex items-center justify-between gap-2 mt-1">
              {treasuryKeys.map(({ label }) => (
                <div
                  key={label}
                  className="flex-1 text-center text-[10px] text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            {data.treasury.yieldCurveInverted && (
              <div className="mt-4 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  <strong>Yield curve inversion detected:</strong> The 2-year
                  yield ({data.treasury.year2.toFixed(2)}%) exceeds the 10-year
                  yield ({data.treasury.year10.toFixed(2)}%). Historically, this
                  pattern has preceded economic recessions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
