import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

export default async function AdminContentPage() {
  const pages = await db.contentPage.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <Link href="/admin/content/new">
          <Button>Create Content</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Views</th>
              <th className="text-left p-3 font-medium">Updated</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b">
                <td className="p-3">
                  <div className="font-medium">{page.title}</div>
                  <div className="text-xs text-muted-foreground">/{page.slug}</div>
                </td>
                <td className="p-3">
                  <Badge variant="secondary">{page.type.replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3">
                  <Badge variant={page.status === "PUBLISHED" ? "default" : "secondary"}>
                    {page.status}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{page.viewCount}</td>
                <td className="p-3 text-muted-foreground text-sm">{formatDate(page.updatedAt)}</td>
                <td className="p-3">
                  <Link href={`/admin/content/${page.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No content pages yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
