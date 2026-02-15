import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import type { AgentSourceType } from "@prisma/client";

export const dynamic = "force-dynamic";

async function addSource(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const type = formData.get("type") as AgentSourceType;
  const category = formData.get("category") as string;

  if (!name || !url || !type || !category) return;

  await db.agentSource.create({
    data: { name, url, type, category },
  });

  revalidatePath("/admin/agents/sources");
}

async function toggleSource(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isActive") === "true";

  await db.agentSource.update({
    where: { id },
    data: { isActive: !current },
  });

  revalidatePath("/admin/agents/sources");
}

async function deleteSource(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await db.agentSource.delete({ where: { id } });
  revalidatePath("/admin/agents/sources");
}

export default async function AgentSourcesPage() {
  const sources = await db.agentSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { evidenceCards: true } } },
  });

  const sourceTypes: AgentSourceType[] = [
    "RSS_FEED",
    "WEBSITE",
    "REGULATORY_BODY",
    "RESEARCH_PAPER",
    "INDUSTRY_REPORT",
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Research Sources</h1>

      {/* Add Source Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Source</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addSource} className="grid gap-4 md:grid-cols-5">
            <input
              name="name"
              placeholder="Source name"
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              name="url"
              type="url"
              placeholder="https://example.com/rss"
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              name="type"
              required
              className="rounded-md border px-3 py-2 text-sm"
            >
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              name="category"
              placeholder="Category"
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Source
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <CardTitle>Sources ({sources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-muted-foreground">No sources configured. Add one above or run the seed script.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Name</th>
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-left py-2 font-medium">Category</th>
                    <th className="text-right py-2 font-medium">Evidence</th>
                    <th className="text-left py-2 font-medium">Last Fetched</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <div className="font-medium">{source.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {source.url}
                        </div>
                      </td>
                      <td className="py-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {source.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2">{source.category}</td>
                      <td className="py-2 text-right">{source._count.evidenceCards}</td>
                      <td className="py-2 text-muted-foreground">
                        {source.lastFetchedAt
                          ? new Date(source.lastFetchedAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${source.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {source.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <form action={toggleSource}>
                            <input type="hidden" name="id" value={source.id} />
                            <input type="hidden" name="isActive" value={String(source.isActive)} />
                            <button
                              type="submit"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {source.isActive ? "Disable" : "Enable"}
                            </button>
                          </form>
                          <form action={deleteSource}>
                            <input type="hidden" name="id" value={source.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
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
