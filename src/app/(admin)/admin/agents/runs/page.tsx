import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgentRunsPage() {
  const runs = await db.agentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { _count: { select: { tasks: true } } },
  });

  const statusColors: Record<string, string> = {
    RUNNING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    PARTIAL: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipeline Run History</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-muted-foreground">No pipeline runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Triggered By</th>
                    <th className="text-right py-2 font-medium">Research</th>
                    <th className="text-right py-2 font-medium">Planned</th>
                    <th className="text-right py-2 font-medium">Written</th>
                    <th className="text-right py-2 font-medium">Published</th>
                    <th className="text-right py-2 font-medium">Tokens</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                    <th className="text-left py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        {new Date(run.startedAt).toLocaleDateString()}{" "}
                        <span className="text-muted-foreground">
                          {new Date(run.startedAt).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[run.status] || "bg-gray-100"}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2">{run.triggeredBy}</td>
                      <td className="py-2 text-right">{run.researchCount}</td>
                      <td className="py-2 text-right">{run.tasksPlanned}</td>
                      <td className="py-2 text-right">{run.articlesWritten}</td>
                      <td className="py-2 text-right">{run.articlesPublished}</td>
                      <td className="py-2 text-right">{formatNumber(run.totalTokensUsed)}</td>
                      <td className="py-2 text-right">${run.totalCostUsd.toFixed(4)}</td>
                      <td className="py-2">
                        <Link
                          href={`/admin/agents/runs/${run.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Details
                        </Link>
                      </td>
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
