export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { Trophy } from "lucide-react";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Best AI Governance Tools & Platforms",
  description:
    "Curated lists of the best AI governance platforms, compliance tools, and risk management solutions reviewed by experts.",
  path: "/best",
});

export const revalidate = 3600;

export default async function BestOfListPage() {
  const pages = await db.contentPage.findMany({
    where: { type: "BEST_OF", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Best AI Governance Tools</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Curated and ranked lists of the top tools for AI compliance, governance,
          and risk management.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {pages.map((page) => (
          <Link key={page.id} href={`/best/${page.slug}`}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <Badge variant="secondary" className="mb-3">
                  <Trophy className="h-3 w-3 mr-1" />
                  Best Of
                </Badge>
                <h2 className="font-semibold line-clamp-2">{page.title}</h2>
                {page.excerpt && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {page.excerpt}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  {page.publishedAt ? formatDate(page.publishedAt) : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {pages.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Best-of lists coming soon. We&apos;re reviewing top AI governance tools!
          </div>
        )}
      </div>
    </div>
  );
}
