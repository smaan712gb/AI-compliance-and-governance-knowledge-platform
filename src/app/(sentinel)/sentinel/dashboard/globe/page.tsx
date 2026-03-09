"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Globe2, RefreshCw, Loader2, AlertCircle } from "lucide-react";

const SentinelGlobe = dynamic(
  () => import("@/components/sentinel/sentinel-globe"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    ),
  },
);

/* ------------------------------------------------------------------ */
/*  Country centroid lookup (~50 countries)                             */
/* ------------------------------------------------------------------ */

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8, lng: -98.5 },
  CA: { lat: 56.1, lng: -106.3 },
  MX: { lat: 23.6, lng: -102.6 },
  BR: { lat: -14.2, lng: -51.9 },
  AR: { lat: -38.4, lng: -63.6 },
  CL: { lat: -35.7, lng: -71.5 },
  CO: { lat: 4.6, lng: -74.1 },
  VE: { lat: 6.4, lng: -66.6 },
  PE: { lat: -9.2, lng: -75.0 },
  GB: { lat: 54.0, lng: -2.0 },
  DE: { lat: 51.2, lng: 10.5 },
  FR: { lat: 46.2, lng: 2.2 },
  IT: { lat: 41.9, lng: 12.6 },
  ES: { lat: 40.5, lng: -3.7 },
  PL: { lat: 51.9, lng: 19.1 },
  NL: { lat: 52.1, lng: 5.3 },
  BE: { lat: 50.5, lng: 4.5 },
  SE: { lat: 60.1, lng: 18.6 },
  NO: { lat: 60.5, lng: 8.5 },
  FI: { lat: 61.9, lng: 25.7 },
  CH: { lat: 46.8, lng: 8.2 },
  AT: { lat: 47.5, lng: 14.6 },
  PT: { lat: 39.4, lng: -8.2 },
  GR: { lat: 39.1, lng: 21.8 },
  RO: { lat: 45.9, lng: 25.0 },
  CZ: { lat: 49.8, lng: 15.5 },
  UA: { lat: 48.4, lng: 31.2 },
  RU: { lat: 61.5, lng: 105.3 },
  TR: { lat: 38.9, lng: 35.2 },
  CN: { lat: 35.9, lng: 104.2 },
  JP: { lat: 36.2, lng: 138.3 },
  KR: { lat: 35.9, lng: 127.8 },
  IN: { lat: 20.6, lng: 79.0 },
  PK: { lat: 30.4, lng: 69.3 },
  BD: { lat: 23.7, lng: 90.4 },
  ID: { lat: -0.8, lng: 113.9 },
  MY: { lat: 4.2, lng: 101.9 },
  SG: { lat: 1.4, lng: 103.8 },
  TH: { lat: 15.9, lng: 100.9 },
  VN: { lat: 14.1, lng: 108.3 },
  PH: { lat: 12.9, lng: 121.8 },
  TW: { lat: 23.7, lng: 121.0 },
  KP: { lat: 40.3, lng: 127.5 },
  AU: { lat: -25.3, lng: 133.8 },
  NZ: { lat: -40.9, lng: 174.9 },
  ZA: { lat: -30.6, lng: 22.9 },
  NG: { lat: 9.1, lng: 8.7 },
  EG: { lat: 26.8, lng: 30.8 },
  KE: { lat: -0.0, lng: 37.9 },
  ET: { lat: 9.1, lng: 40.5 },
  GH: { lat: 7.9, lng: -1.0 },
  SA: { lat: 23.9, lng: 45.1 },
  AE: { lat: 23.4, lng: 53.8 },
  IL: { lat: 31.0, lng: 34.9 },
  IR: { lat: 32.4, lng: 53.7 },
  IQ: { lat: 33.2, lng: 43.7 },
  SY: { lat: 35.0, lng: 38.5 },
  AF: { lat: 33.9, lng: 67.7 },
  YE: { lat: 15.6, lng: 48.5 },
  MM: { lat: 21.9, lng: 96.0 },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IntelligenceEvent {
  id: string;
  headline: string;
  severity: string;
  category: string;
  countryCode: string;
  riskScore: number;
  processedAt: string;
}

interface CrisisIndexScore {
  countryCode: string;
  score: number;
  level: string;
}

interface GlobeEvent {
  id: string;
  headline: string;
  severity: string;
  category: string;
  countryCode: string;
  riskScore: number;
  lat: number;
  lng: number;
  processedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function GlobeViewPage() {
  const [events, setEvents] = useState<GlobeEvent[]>([]);
  const [crisisScores, setCrisisScores] = useState<CrisisIndexScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [intelRes, crisisRes] = await Promise.all([
        fetch("/api/sentinel/intelligence?limit=200"),
        fetch("/api/sentinel/crisis-index"),
      ]);

      if (!intelRes.ok) {
        throw new Error(`Intelligence API returned ${intelRes.status}`);
      }
      if (!crisisRes.ok) {
        throw new Error(`Crisis Index API returned ${crisisRes.status}`);
      }

      const intelJson = await intelRes.json();
      const crisisJson = await crisisRes.json();

      // Transform events — resolve lat/lng from country code
      const rawEvents: IntelligenceEvent[] = intelJson.data ?? [];
      const mapped: GlobeEvent[] = rawEvents
        .filter((ev) => COUNTRY_COORDS[ev.countryCode])
        .map((ev) => ({
          ...ev,
          lat: COUNTRY_COORDS[ev.countryCode].lat,
          lng: COUNTRY_COORDS[ev.countryCode].lng,
        }));

      setEvents(mapped);
      setCrisisScores(crisisJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();

    timerRef.current = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  /* ---------------------------------------------------------------- */
  /*  Error state                                                      */
  /* ---------------------------------------------------------------- */

  if (error && !loading) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <Header eventCount={0} refreshing={false} onRefresh={handleRefresh} />

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-6 w-6" />
            <span className="text-lg font-semibold">
              Failed to load globe data
            </span>
          </div>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {error}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-full flex-col">
      <Header
        eventCount={events.length}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <div className="flex-1 min-h-0">
        <SentinelGlobe
          events={events}
          crisisScores={crisisScores}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header sub-component                                               */
/* ------------------------------------------------------------------ */

function Header({
  eventCount,
  refreshing,
  onRefresh,
}: {
  eventCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b bg-background/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Globe2 className="h-5 w-5 text-emerald-500" />
        <h1 className="text-sm font-bold tracking-wide uppercase">
          Globe View
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Intelligence
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {eventCount} events
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
    </div>
  );
}
