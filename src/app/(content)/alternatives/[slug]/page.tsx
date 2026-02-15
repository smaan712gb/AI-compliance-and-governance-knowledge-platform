import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { Star, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const pages = await db.contentPage.findMany({
      where: { type: "ALTERNATIVES", status: "PUBLISHED" },
      select: { slug: true },
    });
    return pages.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 86400;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await db.contentPage.findUnique({ where: { slug } });
  if (!page) return {};

  return buildMetadata({
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.excerpt || "",
    path: `/alternatives/${slug}`,
    type: "article",
  });
}

export default async function AlternativesPage({ params }: Props) {
  const { slug } = await params;
  const page = await db.contentPage.findUnique({
    where: { slug, type: "ALTERNATIVES", status: "PUBLISHED" },
    include: {
      vendorMentions: {
        include: { vendor: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!page) notFound();

  await db.contentPage.update({
    where: { id: page.id },
    data: { viewCount: { increment: 1 } },
  });

  return (
    <article className="container mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground mb-6">
        Disclosure: This page contains affiliate links. We may earn a commission if you make a purchase, at no extra cost to you.{" "}
        <Link href="/disclosure" className="underline">Learn more</Link>.
      </div>

      <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
        <span>Updated: {formatDate(page.updatedAt)}</span>
        <span>{page.viewCount} views</span>
      </div>

      {page.excerpt && (
        <p className="text-lg text-muted-foreground mb-8">{page.excerpt}</p>
      )}

      <div className="space-y-4">
        {page.vendorMentions.map((mention, i) => (
          <Card key={mention.id} className={mention.isEditorPick ? "border-primary" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                    <h2 className="text-lg font-semibold">{mention.vendor.name}</h2>
                    {mention.isEditorPick && <Badge>Top Pick</Badge>}
                    {mention.vendor.overallScore && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">{mention.vendor.overallScore.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {mention.vendor.shortDescription || mention.vendor.description?.slice(0, 150)}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {mention.vendor.frameworksSupported.slice(0, 4).map((fw) => (
                      <Badge key={fw} variant="secondary" className="text-xs">{fw}</Badge>
                    ))}
                  </div>
                  {mention.customNote && (
                    <p className="text-sm italic text-muted-foreground mb-3">{mention.customNote}</p>
                  )}
                  <div className="flex gap-2">
                    <Link href={`/vendors/${mention.vendor.slug}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Read Review <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    {mention.vendor.affiliateUrl && (
                      <a href={mention.vendor.affiliateUrl} target="_blank" rel="noopener sponsored">
                        <Button size="sm" className="gap-1">
                          Try It <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {page.body && (
        <div className="prose prose-slate max-w-none mt-8">
          <div dangerouslySetInnerHTML={{ __html: page.body }} />
        </div>
      )}
    </article>
  );
}
