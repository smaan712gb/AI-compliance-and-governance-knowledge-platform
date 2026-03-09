"use client";

import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, string> = {
  SENTINEL_CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SENTINEL_HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SENTINEL_MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SENTINEL_LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

// Map country codes to jurisdiction regions
function getJurisdiction(cc: string | null): string {
  if (!cc) return "Global";
  const usRegion = ["US"];
  const euRegion = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "GR", "FI", "SE", "DK", "PL", "CZ", "RO", "HU", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY"];
  const ukRegion = ["GB", "UK"];
  const apacRegion = ["CN", "JP", "KR", "SG", "AU", "NZ", "IN", "HK", "TW", "MY", "TH", "ID", "PH", "VN", "BD", "PK", "MM"];
  const meRegion = ["SA", "AE", "IR", "IQ", "IL", "PS", "SY", "YE", "LB", "JO", "KW", "QA", "BH", "OM", "TR", "EG"];
  const africaRegion = ["NG", "ZA", "KE", "ET", "SD", "SS", "SO", "LY", "ML", "NE", "BF", "CD", "CF", "ZW", "MZ", "TZ"];
  const latamRegion = ["BR", "MX", "AR", "CO", "CL", "PE", "VE", "CU", "EC", "HT"];
  if (usRegion.includes(cc)) return "US";
  if (euRegion.includes(cc)) return "EU";
  if (ukRegion.includes(cc)) return "UK";
  if (apacRegion.includes(cc)) return "APAC";
  if (meRegion.includes(cc)) return "MENA";
  if (africaRegion.includes(cc)) return "Africa";
  if (latamRegion.includes(cc)) return "LatAm";
  return "Global";
}

function normalizeSeverity(s: string): string {
  return s.replace("SENTINEL_", "").toLowerCase();
}

const JURISDICTION_COLORS: Record<string, string> = {
  US: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  EU: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  UK: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  APAC: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  MENA: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Africa: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  LatAm: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Global: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RegulatoryRadarPage() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // Fetch political and economic events (closest to regulatory intelligence)
      const [regRes, econRes] = await Promise.all([
        fetch("/api/sentinel/intelligence?category=POLITICAL&limit=50").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/sentinel/intelligence?category=ECONOMIC&limit=50").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const allEvents = [
        ...(regRes.data || []),
        ...(econRes.data || []),
      ].sort((a: IntelligenceEvent, b: IntelligenceEvent) =>
        new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
      );

      setEvents(allEvents);
    } catch {
      setError("Failed to load regulatory data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive jurisdiction for each event
  const eventsWithJurisdiction = events.map((e) => ({
    ...e,
    jurisdiction: getJurisdiction(e.countryCode),
  }));

  const filtered = eventsWithJurisdiction.filter((e) => {
    if (jurisdictionFilter !== "all" && e.jurisdiction !== jurisdictionFilter) return false;
    if (severityFilter !== "all" && normalizeSeverity(e.severity) !== severityFilter) return false;
    return true;
  });

  // Stats
  const jurisdictions = new Set(eventsWithJurisdiction.map((e) => e.jurisdiction));
  const highImpact = events.filter((e) => {
    const sev = normalizeSeverity(e.severity);
    return sev === "critical" || sev === "high";
  }).length;
  const regulatoryCount = events.filter((e) => e.category === "POLITICAL").length;
  const economicCount = events.filter((e) => e.category === "ECONOMIC").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading regulatory intelligence...</span>
      </div>
    );
  }

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
            Live regulatory changes, compliance events, and jurisdiction-specific intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Jurisdictions</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
            <option value="UK">UK</option>
            <option value="APAC">APAC</option>
            <option value="MENA">MENA</option>
            <option value="Africa">Africa</option>
            <option value="LatAm">LatAm</option>
            <option value="Global">Global</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All Impact</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Events", value: events.length, icon: FileText, color: "text-blue-500" },
          { label: "Political", value: regulatoryCount, icon: Scale, color: "text-indigo-500" },
          { label: "Economic", value: economicCount, icon: TrendingUp, color: "text-emerald-500" },
          { label: "High Impact", value: highImpact, icon: AlertTriangle, color: "text-red-500" },
          { label: "Jurisdictions", value: jurisdictions.size, icon: Globe, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-bold font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ---- Jurisdiction Breakdown ---- */}
      {eventsWithJurisdiction.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-blue-500" />
            By Jurisdiction
          </h2>
          <div className="flex flex-wrap gap-3">
            {["US", "EU", "UK", "APAC", "MENA", "Africa", "LatAm", "Global"].map((j) => {
              const count = eventsWithJurisdiction.filter((e) => e.jurisdiction === j).length;
              if (count === 0) return null;
              return (
                <button
                  key={j}
                  onClick={() => setJurisdictionFilter(jurisdictionFilter === j ? "all" : j)}
                  className={`rounded-lg border px-4 py-3 text-center min-w-[100px] transition-colors ${
                    jurisdictionFilter === j ? "ring-2 ring-emerald-500" : "hover:bg-muted/50"
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${JURISDICTION_COLORS[j] || ""}`}>
                    {j}
                  </span>
                  <p className="text-xl font-bold font-mono">{count}</p>
                  <p className="text-xs text-muted-foreground">events</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Event Feed ---- */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-500" />
            Regulatory &amp; Economic Events
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {events.length === 0
              ? "No regulatory events yet. Events will appear as the intelligence feed processes data from regulatory sources."
              : "No events match the selected filters."}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.slice(0, 30).map((event) => {
              const sev = normalizeSeverity(event.severity);
              return (
                <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            JURISDICTION_COLORS[event.jurisdiction] || JURISDICTION_COLORS.Global
                          }`}
                        >
                          {event.jurisdiction}
                        </span>
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
                      </div>
                      <p className="text-sm font-semibold">{event.headline}</p>
                      {event.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {event.source && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {event.source}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.processedAt).toLocaleDateString()}
                        </span>
                        {event.riskScore != null && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Risk: {event.riskScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Radar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Regulatory Intelligence Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Regulatory events will populate as the Sentinel intelligence feed ingests data from
            regulatory sources across jurisdictions. Run an ingestion cycle to start.
          </p>
        </div>
      )}
    </div>
  );
}
