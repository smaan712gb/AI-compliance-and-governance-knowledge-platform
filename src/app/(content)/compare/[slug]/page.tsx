import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { Star, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const pages = await db.contentPage.findMany({
      where: { type: "COMPARISON", status: "PUBLISHED" },
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
    path: `/compare/${slug}`,
    type: "article",
  });
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const page = await db.contentPage.findUnique({
    where: { slug, type: "COMPARISON", status: "PUBLISHED" },
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

  const vendors = page.vendorMentions.map((m) => m.vendor);

  return (
    <article className="container mx-auto max-w-5xl px-4 py-12">
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

      {/* Side-by-side comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {page.vendorMentions.map((mention) => (
          <Card key={mention.id} className={mention.isEditorPick ? "border-primary" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{mention.vendor.name}</h2>
                {mention.vendor.overallScore && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-lg font-bold">{mention.vendor.overallScore.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                )}
              </div>

              {mention.isEditorPick && <Badge className="mb-3">Editor&apos;s Pick</Badge>}

              <p className="text-sm text-muted-foreground mb-4">
                {mention.vendor.shortDescription || mention.vendor.description?.slice(0, 200)}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="capitalize">{mention.vendor.category.replace(/_/g, " ").toLowerCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pricing</span>
                  <span className="capitalize">{mention.vendor.pricingModel?.replace(/_/g, " ").toLowerCase() || "Contact"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {mention.vendor.frameworksSupported.slice(0, 4).map((fw) => (
                  <Badge key={fw} variant="secondary" className="text-xs">{fw}</Badge>
                ))}
              </div>

              {mention.customNote && (
                <p className="text-sm italic text-muted-foreground mb-4">{mention.customNote}</p>
              )}

              <div className="flex gap-2">
                <Link href={`/vendors/${mention.vendor.slug}`}>
                  <Button variant="outline" size="sm">Full Review</Button>
                </Link>
                {mention.vendor.affiliateUrl && (
                  <a href={mention.vendor.affiliateUrl} target="_blank" rel="noopener sponsored">
                    <Button size="sm" className="gap-1">
                      Visit <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison table */}
      {vendors.length >= 2 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Feature</th>
                    {vendors.map((v) => (
                      <th key={v.id} className="text-center py-2 px-4">{v.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Overall Score</td>
                    {vendors.map((v) => (
                      <td key={v.id} className="text-center py-2 px-4 font-semibold">{v.overallScore?.toFixed(1) || "N/A"}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Pricing Model</td>
                    {vendors.map((v) => (
                      <td key={v.id} className="text-center py-2 px-4 capitalize">{v.pricingModel?.replace(/_/g, " ").toLowerCase() || "N/A"}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Frameworks</td>
                    {vendors.map((v) => (
                      <td key={v.id} className="text-center py-2 px-4">{v.frameworksSupported.length}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {page.body && (
        <div className="prose prose-slate max-w-none mt-8">
          <div dangerouslySetInnerHTML={{ __html: page.body }} />
        </div>
      )}
    </article>
  );
}
