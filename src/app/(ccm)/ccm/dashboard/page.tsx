"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  Plug,
  AlertTriangle,
  BookOpen,
  Activity,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Finding {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  framework: string;
  createdAt: string;
  rule?: { name: string; controlId: string | null };
}

interface Connector {
  id: string;
  name: string;
  erpType: string;
  status: string;
  lastSyncAt: string | null;
  syncJobCount?: number;
}

interface DashboardData {
  organization: { name: string; slug: string } | null;
  connectors: Connector[];
  findings: {
    open: number;
    critical: number;
    high: number;
    total: number;
    recent: Finding[];
  };
  rules: { total: number; frameworks: string[] };
  recentSyncs: { status: string; recordsPulled: number; completedAt: string | null }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
};

function complianceScore(
  total: number,
  critical: number,
  high: number,
  open: number
): number {
  if (total === 0) return 100;
  // Weighted penalty: critical=10, high=5, others=2
  const penalty = critical * 10 + high * 5 + Math.max(0, open - critical - high) * 2;
  const maxPenalty = total * 10;
  return Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-600"
      : score >= 60
      ? "text-amber-500"
      : "text-red-600";
  const barColor =
    score >= 80
      ? "[&>div]:bg-green-500"
      : score >= 60
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-red-500";

  return (
    <div className="space-y-2">
      <div className={`text-4xl font-bold ${color}`}>{score}%</div>
      <Progress value={score} className={barColor} />
      <p className="text-xs text-muted-foreground">
        {score >= 80 ? "Compliant" : score >= 60 ? "Needs Attention" : "At Risk"}
      </p>
    </div>
  );
}

export default function CCMDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError("");
    try {
      const [orgRes, connRes, openRes, critRes, highRes, allRes, rulesRes] =
        await Promise.all([
          fetch("/api/ccm/organizations"),
          fetch("/api/ccm/connectors"),
          fetch("/api/ccm/findings?status=OPEN&limit=5"),
          fetch("/api/ccm/findings?severity=CRITICAL&status=OPEN&limit=1"),
          fetch("/api/ccm/findings?severity=HIGH&status=OPEN&limit=1"),
          fetch("/api/ccm/findings?limit=1"),
          fetch("/api/ccm/rules"),
        ]);

      if (!orgRes.ok && orgRes.status !== 404) {
        throw new Error("Failed to load organization data");
      }

      const [org, conn, openF, critF, highF, allF, rules] = await Promise.all([
        orgRes.json(),
        connRes.json(),
        openRes.json(),
        critRes.json(),
        highRes.json(),
        allRes.json(),
        rulesRes.json(),
      ]);

      // Extract unique frameworks from rules
      const frameworks: string[] = Array.from(
        new Set(
          (rules.data || []).map((r: { framework: string }) => r.framework)
        )
      );

      // Compute last sync info from connectors
      const connectors: Connector[] = conn.data || [];

      setData({
        organization: org.data || null,
        connectors,
        findings: {
          open: openF.pagination?.total || 0,
          critical: critF.pagination?.total || 0,
          high: highF.pagination?.total || 0,
          total: allF.pagination?.total || 0,
          recent: openF.data || [],
        },
        rules: {
          total: rules.data?.length || 0,
          frameworks,
        },
        recentSyncs: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CCM Dashboard</h1>
          <p className="text-muted-foreground">Loading compliance data…</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data?.organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to CCM Platform</h1>
          <p className="text-muted-foreground max-w-md">
            Set up your organization to start monitoring compliance controls
            across your ERP systems.
          </p>
        </div>
        <Link href="/ccm/dashboard/settings">
          <Button size="lg">
            Create Organization
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const score = complianceScore(
    data.findings.total,
    data.findings.critical,
    data.findings.high,
    data.findings.open
  );

  const connectedCount = data.connectors.filter(
    (c) => c.status === "CONNECTED"
  ).length;

  const lastSync = data.connectors.reduce<string | null>((latest, c) => {
    if (!c.lastSyncAt) return latest;
    if (!latest || c.lastSyncAt > latest) return c.lastSyncAt;
    return latest;
  }, null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {data.organization.name}
          </h1>
          <p className="text-muted-foreground">
            Continuous Controls Monitoring Dashboard
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Compliance Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScoreGauge score={score} />
          </CardContent>
        </Card>

        {/* Open Findings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.findings.open}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {data.findings.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {data.findings.critical} critical
                </Badge>
              )}
              {data.findings.high > 0 && (
                <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                  {data.findings.high} high
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {data.findings.total} total
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Connectors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ERP Connectors</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectedCount}/{data.connectors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectedCount} connected
            </p>
            {lastSync && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Last sync{" "}
                {new Date(lastSync).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.rules.total}</div>
            {data.rules.frameworks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {data.rules.frameworks.slice(0, 3).map((fw) => (
                  <span
                    key={fw}
                    className="inline-block text-xs bg-muted rounded px-1.5 py-0.5"
                  >
                    {fw.replace(/_/g, " ")}
                  </span>
                ))}
                {data.rules.frameworks.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{data.rules.frameworks.length - 3}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Recent Critical/High Findings ─────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Open Findings</CardTitle>
              <CardDescription>Latest compliance issues requiring attention</CardDescription>
            </div>
            <Link href="/ccm/dashboard/findings">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.findings.recent.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                No open findings — all clear!
              </div>
            ) : (
              <div className="space-y-3">
                {data.findings.recent.map((f) => (
                  <Link
                    key={f.id}
                    href={`/ccm/dashboard/findings/${f.id}`}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${
                        SEVERITY_COLORS[f.severity] || ""
                      }`}
                    >
                      {f.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.framework.replace(/_/g, " ")} ·{" "}
                        {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Connector Status ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>ERP Connector Status</CardTitle>
              <CardDescription>Sync status for your connected ERP systems</CardDescription>
            </div>
            <Link href="/ccm/dashboard/connectors">
              <Button variant="ghost" size="sm">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.connectors.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <Plug className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No connectors configured yet.
                </p>
                <Link href="/ccm/dashboard/connectors">
                  <Button size="sm">
                    Add Connector <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.connectors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          c.status === "CONNECTED"
                            ? "bg-green-500"
                            : c.status === "ERROR"
                            ? "bg-red-500"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.erpType?.replace(/_/g, " ")}
                          {c.lastSyncAt &&
                            ` · Last sync ${new Date(c.lastSyncAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        c.status === "CONNECTED"
                          ? "default"
                          : c.status === "ERROR"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/ccm/dashboard/rules" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Monitoring Rules
              </CardTitle>
              <CardDescription>
                Create and manage automated compliance rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Manage Rules <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ccm/dashboard/reports" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                AI Reports
              </CardTitle>
              <CardDescription>
                Generate compliance reports for auditors and executives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Generate Report <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ccm/dashboard/audit-log" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Audit Trail
              </CardTitle>
              <CardDescription>
                Immutable log of all platform actions for SOX compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                View Audit Log <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
