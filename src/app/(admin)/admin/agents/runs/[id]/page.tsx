import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const run = await db.agentRun.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { priority: "desc" },
        include: {
          _count: { select: { evidence: true, socialPosts: true } },
        },
      },
    },
  });

  if (!run) notFound();

  const statusColors: Record<string, string> = {
    RUNNING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    PARTIAL: "bg-yellow-100 text-yellow-800",
    PLANNED: "bg-gray-100 text-gray-800",
    WRITING: "bg-purple-100 text-purple-800",
    IN_REVIEW: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    PUBLISHED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/agents/runs" className="text-sm text-blue-600 hover:underline">
          &larr; All Runs
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Run Detail</h1>

      {/* Run Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Pipeline Run
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[run.status] || "bg-gray-100"}`}
            >
              {run.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Started</span>
              <p className="font-medium">{new Date(run.startedAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Completed</span>
              <p className="font-medium">
                {run.completedAt ? new Date(run.completedAt).toLocaleString() : "—"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Triggered By</span>
              <p className="font-medium">{run.triggeredBy}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Duration</span>
              <p className="font-medium">
                {run.completedAt
                  ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-7 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{run.researchCount}</div>
              <div className="text-xs text-muted-foreground">Research</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{run.tasksPlanned}</div>
              <div className="text-xs text-muted-foreground">Planned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{run.articlesWritten}</div>
              <div className="text-xs text-muted-foreground">Written</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{run.articlesApproved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{run.articlesPublished}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(run.totalTokensUsed)}</div>
              <div className="text-xs text-muted-foreground">Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${run.totalCostUsd.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Log */}
      {run.errorLog && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error Log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-red-50 p-4 rounded-md whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(run.errorLog, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({run.tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {run.tasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks in this run.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Title</th>
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">QA Score</th>
                    <th className="text-right py-2 font-medium">Rewrites</th>
                    <th className="text-right py-2 font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {run.tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 font-medium max-w-xs truncate">{task.title}</td>
                      <td className="py-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {task.type}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status] || "bg-gray-100"}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {task.qaScore ? task.qaScore.toFixed(1) : "—"}
                      </td>
                      <td className="py-2 text-right">{task.rewriteCount}</td>
                      <td className="py-2 text-right">{task._count.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
