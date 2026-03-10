import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Return empty to avoid concurrent DB connection exhaustion during build.
  // Pages are generated on first request via ISR (revalidate).
  return [];
}

export const revalidate = 86400;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await db.contentPage.findUnique({ where: { slug } });
  if (!post) return {};

  const metadata = buildMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || "",
    path: `/blog/${slug}`,
    type: "article",
  });

  // Add article-specific OG metadata
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await db.contentPage.findUnique({
    where: { slug, type: "BLOG_POST", status: "PUBLISHED" },
  });

  if (!post) notFound();

  // Increment view count
  await db.contentPage.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  });

  return (
    <article>
      {/* Hero section with featured image */}
      {post.featuredImageUrl ? (
        <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden bg-slate-900">
          <img
            src={post.featuredImageUrl}
            alt={post.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-3xl mx-auto">
            <div className="flex gap-2 mb-3">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur-sm">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-sm text-white/70">
              {post.author && <span>{post.author}</span>}
              {post.publishedAt && (
                <span>{formatDate(post.publishedAt)}</span>
              )}
              <span>{post.viewCount} views</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto max-w-3xl px-4 pt-12 pb-6">
          <div className="flex gap-2 mb-3">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
            {post.author && <span>By {post.author}</span>}
            {post.publishedAt && (
              <span>{formatDate(post.publishedAt)}</span>
            )}
            <span>Updated: {formatDate(post.updatedAt)}</span>
            <span>{post.viewCount} views</span>
          </div>
        </div>
      )}

      {/* Article body */}
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="prose prose-slate max-w-none prose-headings:scroll-mt-20 prose-img:rounded-lg prose-a:text-primary">
          <div dangerouslySetInnerHTML={{ __html: post.body }} />
        </div>
      </div>
    </article>
  );
}
