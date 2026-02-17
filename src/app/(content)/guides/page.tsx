export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "AI Governance Guides - In-Depth Compliance Resources",
  description:
    "Comprehensive guides on EU AI Act compliance, AI risk management, vendor due diligence, and governance best practices.",
  path: "/guides",
});

export const revalidate = 3600;

export default async function GuidesPage() {
  const guides = await db.contentPage.findMany({
    where: { type: "GUIDE", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">AI Governance Guides</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          In-depth guides on AI compliance, risk management, and governance
          frameworks.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {guides.map((guide) => {
          const readingTime = guide.body
            ? Math.ceil(guide.body.split(/\s+/).length / 200)
            : 5;
          return (
            <Link key={guide.id} href={`/guides/${guide.slug}`}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <Badge variant="secondary" className="mb-3">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Guide
                  </Badge>
                  <h2 className="font-semibold line-clamp-2">{guide.title}</h2>
                  {guide.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {guide.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                    <span>
                      {guide.publishedAt ? formatDate(guide.publishedAt) : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {readingTime} min read
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {guides.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Guides coming soon. Check back for in-depth compliance resources!
          </div>
        )}
      </div>
    </div>
  );
}
