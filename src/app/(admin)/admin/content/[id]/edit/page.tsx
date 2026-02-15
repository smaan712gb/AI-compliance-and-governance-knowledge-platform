import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const page = await db.contentPage.findUnique({ where: { id } });
  if (!page) notFound();

  async function updateContent(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const type = formData.get("type") as string;
    const excerpt = formData.get("excerpt") as string;
    const body = formData.get("body") as string;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const status = formData.get("status") as string;

    await db.contentPage.update({
      where: { id },
      data: {
        title,
        slug,
        type: type as "BLOG_POST" | "BEST_OF" | "COMPARISON" | "ALTERNATIVES" | "GUIDE" | "LANDING_PAGE",
        excerpt: excerpt || null,
        body: body || "",
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        status: (status as "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED") || "DRAFT",
      },
    });

    redirect("/admin/content");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit: {page.title}</h1>
      <form action={updateContent}>
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={page.title} required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={page.slug} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" defaultValue={page.type} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="BLOG_POST">Blog Post</option>
                  <option value="BEST_OF">Best Of</option>
                  <option value="COMPARISON">Comparison</option>
                  <option value="ALTERNATIVES">Alternatives</option>
                  <option value="GUIDE">Guide</option>
                  <option value="LANDING_PAGE">Landing Page</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={page.status} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" name="excerpt" defaultValue={page.excerpt || ""} rows={2} />
            </div>
            <div>
              <Label htmlFor="body">Body (HTML)</Label>
              <Textarea id="body" name="body" defaultValue={page.body || ""} rows={12} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input id="metaTitle" name="metaTitle" defaultValue={page.metaTitle || ""} />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Input id="metaDescription" name="metaDescription" defaultValue={page.metaDescription || ""} />
              </div>
            </div>
            <Button type="submit">Save Changes</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
