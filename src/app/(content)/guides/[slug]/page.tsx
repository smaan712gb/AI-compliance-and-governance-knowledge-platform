import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { BookOpen, Clock } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const pages = await db.contentPage.findMany({
      where: { type: "GUIDE", status: "PUBLISHED" },
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
    path: `/guides/${slug}`,
    type: "article",
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const page = await db.contentPage.findUnique({
    where: { slug, type: "GUIDE", status: "PUBLISHED" },
  });

  if (!page) notFound();

  await db.contentPage.update({
    where: { id: page.id },
    data: { viewCount: { increment: 1 } },
  });

  const readingTime = page.body ? Math.ceil(page.body.split(/\s+/).length / 200) : 5;

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          <BookOpen className="h-3 w-3 mr-1" />
          Guide
        </Badge>
        <h1 className="text-3xl font-bold mb-3">{page.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Updated: {formatDate(page.updatedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime} min read
          </span>
          <span>{page.viewCount} views</span>
        </div>
      </div>

      {page.excerpt && (
        <div className="rounded-lg bg-muted p-6 mb-8">
          <p className="text-lg text-muted-foreground">{page.excerpt}</p>
        </div>
      )}

      {page.body && (
        <div className="prose prose-slate max-w-none">
          <div dangerouslySetInnerHTML={{ __html: page.body }} />
        </div>
      )}
    </article>
  );
}
