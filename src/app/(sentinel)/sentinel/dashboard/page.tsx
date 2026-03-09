"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  ShieldAlert,
  BarChart3,
  Truck,
  Brain,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  tier: string;
  limits: {
    reasoningCallsPerDay: number;
    screeningCallsPerDay: number;
    requestsPerDay: number;
  };
}

interface CrisisScore {
  countryCode: string;
  countryName: string;
  score: number;
  level: string;
  trend: string;
}

const LEVEL_COLORS: Record<string, string> = {
  critical: "text-red-600 bg-red-50",
  severe: "text-orange-600 bg-orange-50",
  elevated: "text-yellow-600 bg-yellow-50",
  guarded: "text-blue-600 bg-blue-50",
  low: "text-green-600 bg-green-50",
};

const TREND_ICONS: Record<string, string> = {
  escalating: "↑",
  stable: "→",
  improving: "↓",
};

export default function SentinelDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [crisisScores, setCrisisScores] = useState<CrisisScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sentinel/subscription").then((r) => r.json()).catch(() => null),
      fetch("/api/sentinel/crisis-index").then((r) => r.json()).catch(() => null),
    ]).then(([sub, crisis]) => {
      if (sub?.data) setStats(sub.data);
      if (crisis?.data) {
        const scores = Array.isArray(crisis.data) ? crisis.data : [];
        setCrisisScores(scores.slice(0, 10));
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sentinel Dashboard</h1>
        <p className="text-muted-foreground">
          Geopolitical intelligence overview
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/sentinel/dashboard/intelligence" className="group">
          <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <Brain className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold">AI Reasoning</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyze events with DeepSeek R1 chain-of-thought reasoning
            </p>
            <div className="text-xs text-emerald-600 mt-2">
              {stats?.limits.reasoningCallsPerDay || 5} analyses/day
            </div>
          </div>
        </Link>

        <Link href="/sentinel/dashboard/screening" className="group">
          <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold">Entity Screening</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Screen entities against 27+ sanctions and PEP lists
            </p>
            <div className="text-xs text-red-600 mt-2">
              {stats?.limits.screeningCallsPerDay || 10} screenings/day
            </div>
          </div>
        </Link>

        <Link href="/sentinel/dashboard/crisis-index" className="group">
          <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-semibold">Crisis Index</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Global instability scoring for 200+ countries
            </p>
            <div className="text-xs text-amber-600 mt-2">
              Real-time updates
            </div>
          </div>
        </Link>

        <Link href="/sentinel/dashboard/supply-chain" className="group">
          <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Supply Chain</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Supplier risk assessment and portfolio analysis
            </p>
            <div className="text-xs text-blue-600 mt-2">
              Expert+ tier
            </div>
          </div>
        </Link>
      </div>

      {/* Crisis Index Top 10 */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Top Crisis Index Scores</h2>
          </div>
          <Link href="/sentinel/dashboard/crisis-index">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="divide-y">
          {crisisScores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No crisis data available yet</p>
            </div>
          ) : (
            crisisScores.map((c) => (
              <div
                key={c.countryCode}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono w-8">{c.countryCode}</span>
                  <div>
                    <p className="font-medium text-sm">{c.countryName}</p>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        LEVEL_COLORS[c.level] || ""
                      }`}
                    >
                      {c.level.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {TREND_ICONS[c.trend] || "→"}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono">
                      {c.score}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      /100
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
