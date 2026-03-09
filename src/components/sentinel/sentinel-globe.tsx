"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import {
  Loader2,
  Layers,
  Eye,
  EyeOff,
  RotateCw,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IntelEvent {
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

interface CrisisScore {
  countryCode: string;
  score: number;
  level: string;
}

export interface SentinelGlobeProps {
  events: IntelEvent[];
  crisisScores?: CrisisScore[];
  isLoading?: boolean;
  onEventClick?: (event: IntelEvent) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444", // red-500
  high: "#f97316", // orange-500
  medium: "#eab308", // yellow-500
  low: "#22c55e", // green-500
  info: "#3b82f6", // blue-500
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

const CRISIS_LEVEL_COLORS: Record<string, string> = {
  extreme: "#ef4444",
  high: "#f97316",
  elevated: "#eab308",
  moderate: "#22c55e",
  low: "#6b7280",
};

function severityColor(severity: string): string {
  return SEVERITY_COLORS[severity.toLowerCase()] ?? "#6b7280";
}

/* ------------------------------------------------------------------ */
/*  Arc helpers                                                        */
/* ------------------------------------------------------------------ */

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  category: string;
}

function buildArcs(events: IntelEvent[]): ArcDatum[] {
  // Group events by category, then create arcs between pairs in the
  // same category but different countries (limit to keep it performant).
  const byCategory: Record<string, IntelEvent[]> = {};
  for (const ev of events) {
    const cat = ev.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ev);
  }

  const arcs: ArcDatum[] = [];
  const MAX_ARCS_PER_CAT = 6;

  for (const [, group] of Object.entries(byCategory)) {
    if (group.length < 2) continue;
    let count = 0;
    for (let i = 0; i < group.length && count < MAX_ARCS_PER_CAT; i++) {
      for (
        let j = i + 1;
        j < group.length && count < MAX_ARCS_PER_CAT;
        j++
      ) {
        if (group[i].countryCode === group[j].countryCode) continue;
        arcs.push({
          startLat: group[i].lat,
          startLng: group[i].lng,
          endLat: group[j].lat,
          endLng: group[j].lng,
          color: severityColor(group[i].severity),
          category: group[i].category,
        });
        count++;
      }
    }
  }
  return arcs;
}

/* ------------------------------------------------------------------ */
/*  Label helpers                                                      */
/* ------------------------------------------------------------------ */

// Approximate lat/lng for country codes so labels can render for crisis hotspots.
// This is a minimal lookup — a production build would use a real dataset.
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 39.8, lng: -98.6, name: "United States" },
  CN: { lat: 35.9, lng: 104.2, name: "China" },
  RU: { lat: 61.5, lng: 105.3, name: "Russia" },
  GB: { lat: 55.4, lng: -3.4, name: "United Kingdom" },
  UA: { lat: 48.4, lng: 31.2, name: "Ukraine" },
  IR: { lat: 32.4, lng: 53.7, name: "Iran" },
  KP: { lat: 40.3, lng: 127.5, name: "North Korea" },
  TW: { lat: 23.7, lng: 121.0, name: "Taiwan" },
  IL: { lat: 31.0, lng: 34.9, name: "Israel" },
  SA: { lat: 23.9, lng: 45.1, name: "Saudi Arabia" },
  IN: { lat: 20.6, lng: 79.0, name: "India" },
  BR: { lat: -14.2, lng: -51.9, name: "Brazil" },
  NG: { lat: 9.1, lng: 8.7, name: "Nigeria" },
  DE: { lat: 51.2, lng: 10.5, name: "Germany" },
  FR: { lat: 46.2, lng: 2.2, name: "France" },
  JP: { lat: 36.2, lng: 138.3, name: "Japan" },
  KR: { lat: 35.9, lng: 127.8, name: "South Korea" },
  AU: { lat: -25.3, lng: 133.8, name: "Australia" },
  ZA: { lat: -30.6, lng: 22.9, name: "South Africa" },
  MX: { lat: 23.6, lng: -102.6, name: "Mexico" },
  PK: { lat: 30.4, lng: 69.3, name: "Pakistan" },
  EG: { lat: 26.8, lng: 30.8, name: "Egypt" },
  TR: { lat: 38.9, lng: 35.2, name: "Turkey" },
  PL: { lat: 51.9, lng: 19.1, name: "Poland" },
  SY: { lat: 35.0, lng: 38.5, name: "Syria" },
  MM: { lat: 21.9, lng: 96.0, name: "Myanmar" },
  VE: { lat: 6.4, lng: -66.6, name: "Venezuela" },
  AF: { lat: 33.9, lng: 67.7, name: "Afghanistan" },
  YE: { lat: 15.6, lng: 48.5, name: "Yemen" },
  ET: { lat: 9.1, lng: 40.5, name: "Ethiopia" },
};

interface LabelDatum {
  lat: number;
  lng: number;
  text: string;
  size: number;
  color: string;
  countryCode: string;
}

function buildLabels(crisisScores: CrisisScore[]): LabelDatum[] {
  return crisisScores
    .filter((cs) => COUNTRY_COORDS[cs.countryCode])
    .map((cs) => {
      const coords = COUNTRY_COORDS[cs.countryCode];
      return {
        lat: coords.lat,
        lng: coords.lng,
        text: `${coords.name} (${cs.score})`,
        size: 0.6 + cs.score / 100,
        color: CRISIS_LEVEL_COLORS[cs.level] ?? "#6b7280",
        countryCode: cs.countryCode,
      };
    });
}

/* ------------------------------------------------------------------ */
/*  Tooltip builder                                                    */
/* ------------------------------------------------------------------ */

function pointTooltip(ev: IntelEvent): string {
  const sev = ev.severity.toLowerCase();
  const color = severityColor(sev);
  return `
    <div style="
      background: rgba(10,10,20,0.92);
      border: 1px solid ${color};
      border-radius: 8px;
      padding: 10px 14px;
      max-width: 280px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #e2e8f0;
      line-height: 1.45;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    ">
      <div style="
        display: inline-block;
        background: ${color};
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 6px;
      ">${sev}</div>
      <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">
        ${ev.headline}
      </div>
      <div style="font-size: 11px; color: #94a3b8;">
        ${ev.countryCode} &middot; Risk ${ev.riskScore}/100 &middot; ${ev.category}
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SentinelGlobe({
  events,
  crisisScores = [],
  isLoading = false,
  onEventClick,
}: SentinelGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions — responsive fill
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({
        width: clientWidth || 800,
        height: clientHeight || 600,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Auto-rotate
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.4;
    }
  }, [autoRotate]);

  // Initial camera position
  const [globeReady, setGlobeReady] = useState(false);
  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
    }
    globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1000);
  }, []);

  // Layer visibility
  const [showEvents, setShowEvents] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Severity filter
  const [sevFilter, setSevFilter] = useState<Set<string>>(
    () => new Set(SEVERITY_ORDER),
  );
  const toggleSev = (s: string) => {
    setSevFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  // Controls panel collapsed state
  const [controlsOpen, setControlsOpen] = useState(true);

  // Filtered events
  const filteredEvents = useMemo(
    () => events.filter((e) => sevFilter.has(e.severity.toLowerCase())),
    [events, sevFilter],
  );

  // Derived data
  const pointsData = useMemo(
    () => (showEvents ? filteredEvents : []),
    [showEvents, filteredEvents],
  );

  const arcsData = useMemo(
    () => (showArcs ? buildArcs(filteredEvents) : []),
    [showArcs, filteredEvents],
  );

  const labelsData = useMemo(
    () => (showLabels ? buildLabels(crisisScores) : []),
    [showLabels, crisisScores],
  );

  // Handle event click
  const handlePointClick = useCallback(
    (point: object) => {
      const ev = point as IntelEvent;
      onEventClick?.(ev);
    },
    [onEventClick],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-[#070b14]"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070b14]/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="mt-3 text-sm font-medium tracking-wide text-slate-400">
            Loading intelligence data...
          </p>
        </div>
      )}

      {/* Globe */}
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere
        atmosphereColor="#10b981"
        atmosphereAltitude={0.25}
        onGlobeReady={handleGlobeReady}
        // Points (events)
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: object) =>
          severityColor((d as IntelEvent).severity)
        }
        pointAltitude={(d: object) =>
          0.01 + ((d as IntelEvent).riskScore / 100) * 0.12
        }
        pointRadius={(d: object) =>
          0.25 + ((d as IntelEvent).riskScore / 100) * 0.55
        }
        pointLabel={(d: object) => pointTooltip(d as IntelEvent)}
        onPointClick={handlePointClick}
        pointsTransitionDuration={600}
        // Arcs
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.6}
        arcDashGap={0.3}
        arcDashAnimateTime={2000}
        arcStroke={0.4}
        arcsTransitionDuration={600}
        // Labels (crisis hotspots)
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelColor="color"
        labelDotRadius={0.4}
        labelResolution={2}
        labelAltitude={0.015}
        labelsTransitionDuration={600}
      />

      {/* ---- Controls Panel (top-right) ---- */}
      <div
        className={cn(
          "absolute right-3 top-3 z-20 w-56 rounded-lg border border-slate-700/60",
          "bg-slate-900/85 shadow-2xl backdrop-blur-md transition-all",
        )}
      >
        {/* Header */}
        <button
          onClick={() => setControlsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-slate-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Controls
          </span>
          {controlsOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {controlsOpen && (
          <div className="space-y-3 border-t border-slate-700/50 px-3 pb-3 pt-2">
            {/* Layers */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Layers
              </p>
              <div className="space-y-1">
                <LayerToggle
                  label="Events"
                  active={showEvents}
                  onToggle={() => setShowEvents((v) => !v)}
                />
                <LayerToggle
                  label="Arcs"
                  active={showArcs}
                  onToggle={() => setShowArcs((v) => !v)}
                />
                <LayerToggle
                  label="Crisis Labels"
                  active={showLabels}
                  onToggle={() => setShowLabels((v) => !v)}
                />
              </div>
            </div>

            {/* Severity filter */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <Filter className="mr-1 inline h-3 w-3" />
                Severity
              </p>
              <div className="space-y-1">
                {SEVERITY_ORDER.map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={sevFilter.has(s)}
                      onChange={() => toggleSev(s)}
                      className="h-3 w-3 rounded border-slate-600 accent-emerald-500"
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: SEVERITY_COLORS[s] }}
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Auto rotate */}
            <button
              onClick={() => setAutoRotate((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                autoRotate
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <RotateCw
                className={cn("h-3.5 w-3.5", autoRotate && "animate-spin")}
                style={
                  autoRotate
                    ? { animationDuration: "4s" }
                    : undefined
                }
              />
              Auto-rotate {autoRotate ? "On" : "Off"}
            </button>
          </div>
        )}
      </div>

      {/* ---- Legend (bottom-left) ---- */}
      <div
        className={cn(
          "absolute bottom-3 left-3 z-20 rounded-lg border border-slate-700/60",
          "bg-slate-900/85 px-3 py-2.5 shadow-2xl backdrop-blur-md",
        )}
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Severity
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {SEVERITY_ORDER.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
                style={{
                  background: SEVERITY_COLORS[s],
                  boxShadow: `0 0 6px ${SEVERITY_COLORS[s]}88`,
                }}
              />
              <span className="text-[11px] capitalize text-slate-400">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Event count badge (top-left) ---- */}
      {globeReady && !isLoading && (
        <div
          className={cn(
            "absolute left-3 top-3 z-20 rounded-lg border border-slate-700/60",
            "bg-slate-900/85 px-3 py-2 shadow-2xl backdrop-blur-md",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Live Events
          </p>
          <p className="text-lg font-bold tabular-nums text-emerald-400">
            {filteredEvents.length}
            <span className="ml-1 text-xs font-normal text-slate-500">
              / {events.length}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LayerToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
        active
          ? "text-slate-200"
          : "text-slate-500 line-through decoration-slate-600",
      )}
    >
      {active ? (
        <Eye className="h-3 w-3 text-emerald-400" />
      ) : (
        <EyeOff className="h-3 w-3 text-slate-600" />
      )}
      {label}
    </button>
  );
}
