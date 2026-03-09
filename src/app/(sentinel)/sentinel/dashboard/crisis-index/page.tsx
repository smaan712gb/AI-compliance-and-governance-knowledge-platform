"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Search } from "lucide-react";

interface CrisisScore {
  countryCode: string;
  countryName: string;
  score: number;
  level: string;
  trend: string;
  components: {
    deadliness: number;
    civilianDanger: number;
    diffusion: number;
    fragmentation: number;
  };
  indicators: {
    conflictEvents: number;
    fatalities: number;
    protestEvents: number;
    militaryActivity: number;
    internetOutages: number;
    newsVelocity: number;
  };
}

const LEVEL_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  severe: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  elevated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  guarded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SCORE_BAR_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  severe: "bg-orange-500",
  elevated: "bg-yellow-500",
  guarded: "bg-blue-500",
  low: "bg-green-500",
};

export default function CrisisIndexPage() {
  const [scores, setScores] = useState<CrisisScore[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<CrisisScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sentinel/crisis-index")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) setScores(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = scores.filter(
    (s) =>
      !filter ||
      s.countryName.toLowerCase().includes(filter.toLowerCase()) ||
      s.countryCode.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Crisis Index</h1>
        <p className="text-muted-foreground">
          Real-time country instability scoring based on conflict, protest, and
          military indicators
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search countries..."
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Country List */}
        <div className="lg:col-span-2 rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">
              {filtered.length} Countries Tracked
            </span>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filtered.map((s) => (
              <button
                key={s.countryCode}
                onClick={() => setSelected(s)}
                className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 text-left transition-colors ${
                  selected?.countryCode === s.countryCode ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono w-8 text-muted-foreground">
                    {s.countryCode}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.countryName}</p>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        LEVEL_COLORS[s.level] || ""
                      }`}
                    >
                      {s.level.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${SCORE_BAR_COLORS[s.level] || "bg-gray-500"}`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold font-mono w-8 text-right">
                    {s.score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-lg border bg-card p-5">
          {selected ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{selected.countryName}</h2>
                  <span className="text-sm font-mono text-muted-foreground">
                    {selected.countryCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      LEVEL_COLORS[selected.level] || ""
                    }`}
                  >
                    {selected.level.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {selected.trend}
                  </span>
                </div>
                <div className="text-4xl font-bold font-mono mt-3">
                  {selected.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Components */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Components
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Deadliness", value: selected.components.deadliness },
                    { label: "Civilian Danger", value: selected.components.civilianDanger },
                    { label: "Diffusion", value: selected.components.diffusion },
                    { label: "Fragmentation", value: selected.components.fragmentation },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{c.label}</span>
                        <span className="font-mono">{c.value}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${c.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicators */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Raw Indicators
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Conflict Events", value: selected.indicators.conflictEvents },
                    { label: "Fatalities", value: selected.indicators.fatalities },
                    { label: "Protests", value: selected.indicators.protestEvents },
                    { label: "Military Activity", value: selected.indicators.militaryActivity },
                    { label: "Internet Outages", value: selected.indicators.internetOutages },
                    { label: "News Velocity", value: selected.indicators.newsVelocity },
                  ].map((ind) => (
                    <div key={ind.label} className="rounded-md bg-muted/50 p-2 text-center">
                      <div className="text-xs text-muted-foreground">{ind.label}</div>
                      <div className="text-lg font-bold font-mono">{ind.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a country to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
