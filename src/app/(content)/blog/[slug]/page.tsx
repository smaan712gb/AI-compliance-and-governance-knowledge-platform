import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const posts = await db.contentPage.findMany({
      where: { type: "BLOG_POST", status: "PUBLISHED" },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 86400;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await db.contentPage.findUnique({ where: { slug } });
  if (!post) return {};

  return buildMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || "",
    path: `/blog/${slug}`,
    type: "article",
  });
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
    <article className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
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
          <span>{post.viewCount} views</span>
        </div>
      </div>

      {post.featuredImageUrl && (
        <img
          src={post.featuredImageUrl}
          alt={post.title}
          className="w-full rounded-lg mb-8"
        />
      )}

      <div className="prose prose-slate max-w-none">
        <div dangerouslySetInnerHTML={{ __html: post.body }} />
      </div>
    </article>
  );
}
