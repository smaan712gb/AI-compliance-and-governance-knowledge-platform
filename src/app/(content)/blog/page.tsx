export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { BlogDomainFilter } from "@/components/blog-domain-filter";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Blog - Compliance Insights & Regulatory Updates",
  description:
    "Stay updated on AI governance, e-invoicing mandates, SOC 2, cybersecurity, data privacy, ESG, tax compliance, and more.",
  path: "/blog",
});

export const revalidate = 3600;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const params = await searchParams;
  const domain = params.domain;

  const posts = await db.contentPage.findMany({
    where: {
      status: "PUBLISHED",
      ...(domain ? { category: domain } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Compliance Blog</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Insights, updates, and guides on regulatory compliance — from AI
          governance and e-invoicing to cybersecurity, privacy, and beyond.
        </p>
        <div className="mt-6">
          <BlogDomainFilter />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {posts.map((post) => {
          const typePathMap: Record<string, string> = {
            BLOG_POST: "blog",
            GUIDE: "guides",
            BEST_OF: "best",
            COMPARISON: "compare",
            ALTERNATIVES: "alternatives",
          };
          const basePath = typePathMap[post.type] || "blog";
          const typeLabel = post.type === "BLOG_POST" ? null : post.type.replace(/_/g, " ");

          return (
            <Link key={post.id} href={`/${basePath}/${post.slug}`}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                {post.featuredImageUrl && (
                  <img
                    src={post.featuredImageUrl}
                    alt={post.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardContent className={post.featuredImageUrl ? "pt-4" : "pt-6"}>
                  <div className="flex gap-2 mb-2">
                    {typeLabel && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {typeLabel.toLowerCase()}
                      </Badge>
                    )}
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="font-semibold line-clamp-2">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {post.publishedAt ? formatDate(post.publishedAt) : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {posts.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {domain
              ? `No posts yet in this category. Content is being generated — check back soon!`
              : `Blog posts coming soon. Subscribe to be notified!`}
          </div>
        )}
      </div>
    </div>
  );
}
