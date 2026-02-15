import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, FileText, Database, Zap, DollarSign, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function triggerPipeline() {
  "use server";
  const { runPipeline } = await import("@/lib/agents/pipeline");
  await runPipeline("manual");
}

export default async function AgentDashboardPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalRuns,
    latestRun,
    articlesThisWeek,
    evidenceCount,
    approvalRate,
    totalCost,
  ] = await Promise.all([
    db.agentRun.count(),
    db.agentRun.findFirst({
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { tasks: true } } },
    }),
    db.agentTask.count({
      where: {
        status: "PUBLISHED",
        createdAt: { gte: weekAgo },
      },
    }),
    db.evidenceCard.count(),
    db.agentTask
      .count({ where: { status: { in: ["APPROVED", "PUBLISHED"] } } })
      .then(async (approved) => {
        const total = await db.agentTask.count({
          where: { status: { notIn: ["PLANNED"] } },
        });
        return total > 0 ? Math.round((approved / total) * 100) : 0;
      }),
    db.agentRun.aggregate({ _sum: { totalCostUsd: true } }).then((r) => r._sum.totalCostUsd || 0),
  ]);

  const stats = [
    { title: "Total Runs", value: formatNumber(totalRuns), icon: Zap },
    { title: "Articles This Week", value: formatNumber(articlesThisWeek), icon: FileText },
    { title: "Evidence Cards", value: formatNumber(evidenceCount), icon: Database },
    { title: "Approval Rate", value: `${approvalRate}%`, icon: Bot },
    { title: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: DollarSign },
  ];

  const statusColors: Record<string, string> = {
    RUNNING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    PARTIAL: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agent Pipeline</h1>
        <form action={triggerPipeline}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Zap className="h-4 w-4" />
            Run Pipeline Now
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Run */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Latest Pipeline Run</CardTitle>
        </CardHeader>
        <CardContent>
          {latestRun ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[latestRun.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {latestRun.status}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(latestRun.startedAt).toLocaleString()}
                </span>
                <span className="text-sm">
                  Triggered by: {latestRun.triggeredBy}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Research: </span>
                  <strong>{latestRun.researchCount}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Planned: </span>
                  <strong>{latestRun.tasksPlanned}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Written: </span>
                  <strong>{latestRun.articlesWritten}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Approved: </span>
                  <strong>{latestRun.articlesApproved}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Published: </span>
                  <strong>{latestRun.articlesPublished}</strong>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Tokens: {formatNumber(latestRun.totalTokensUsed)} | Cost: ${latestRun.totalCostUsd.toFixed(4)}
              </div>
              {latestRun.errorLog && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <pre className="text-xs text-red-700 whitespace-pre-wrap">
                    {JSON.stringify(latestRun.errorLog, null, 2)}
                  </pre>
                </div>
              )}
              <Link
                href={`/admin/agents/runs/${latestRun.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View full details &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">No pipeline runs yet. Click &quot;Run Pipeline Now&quot; to start.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/agents/runs">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-medium">Run History</h3>
              <p className="text-sm text-muted-foreground mt-1">View all pipeline executions</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/agents/tasks">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-medium">Task Queue</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage content tasks</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/agents/sources">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-medium">Sources</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage RSS feeds & sources</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/agents/settings">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-medium">Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">Pipeline configuration</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
