import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewContentPage() {
  async function createContent(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const type = formData.get("type") as string;
    const excerpt = formData.get("excerpt") as string;
    const body = formData.get("body") as string;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const status = formData.get("status") as string;

    await db.contentPage.create({
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
      <h1 className="text-2xl font-bold mb-6">Create Content Page</h1>
      <form action={createContent}>
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" required placeholder="url-friendly-slug" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
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
                <select id="status" name="status" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" name="excerpt" rows={2} />
            </div>
            <div>
              <Label htmlFor="body">Body (HTML)</Label>
              <Textarea id="body" name="body" rows={12} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input id="metaTitle" name="metaTitle" />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Input id="metaDescription" name="metaDescription" />
              </div>
            </div>
            <Button type="submit">Create Content</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
