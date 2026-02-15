import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import type { AgentTaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AgentTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as AgentTaskStatus } : {};

  const [tasks, total] = await Promise.all([
    db.agentTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        run: { select: { id: true, startedAt: true } },
        contentPage: { select: { slug: true } },
      },
    }),
    db.agentTask.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const statusColors: Record<string, string> = {
    PLANNED: "bg-gray-100 text-gray-800",
    WRITING: "bg-purple-100 text-purple-800",
    IN_REVIEW: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    PUBLISHED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  const statuses = ["PLANNED", "WRITING", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Content Task Queue</h1>

      {/* Status Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/admin/agents/tasks"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!status ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          All ({total})
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/agents/tasks?status=${s}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === s ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Title</th>
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">QA Score</th>
                    <th className="text-right py-2 font-medium">Priority</th>
                    <th className="text-left py-2 font-medium">Created</th>
                    <th className="text-left py-2 font-medium">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 font-medium max-w-sm">
                        <div className="truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.slug}</div>
                      </td>
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
                      <td className="py-2 text-right">{task.priority}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {task.contentPage ? (
                          <Link
                            href={`/blog/${task.contentPage.slug}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            View
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {page > 1 && (
                    <Link
                      href={`/admin/agents/tasks?${status ? `status=${status}&` : ""}page=${page - 1}`}
                      className="px-3 py-1 rounded border text-sm hover:bg-muted"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="px-3 py-1 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/admin/agents/tasks?${status ? `status=${status}&` : ""}page=${page + 1}`}
                      className="px-3 py-1 rounded border text-sm hover:bg-muted"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
