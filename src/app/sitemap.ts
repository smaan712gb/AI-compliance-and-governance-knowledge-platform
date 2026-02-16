import { MetadataRoute } from "next";
import { db } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aigovhub.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ai-act-checker`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/vendor-risk-questionnaire`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/vendors`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-we-evaluate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/disclosure`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const vendors = await db.vendor.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const vendorPages: MetadataRoute.Sitemap = vendors.map((v) => ({
      url: `${SITE_URL}/vendors/${v.slug}`,
      lastModified: v.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const contentPages = await db.contentPage.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, type: true, updatedAt: true },
    });

    const contentUrls: MetadataRoute.Sitemap = contentPages.map((p) => {
      const prefix: Record<string, string> = {
        BLOG_POST: "blog",
        BEST_OF: "best",
        COMPARISON: "compare",
        ALTERNATIVES: "alternatives",
        GUIDE: "guides",
        LANDING_PAGE: "",
      };
      return {
        url: `${SITE_URL}/${prefix[p.type] || "blog"}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: ["BEST_OF", "COMPARISON"].includes(p.type) ? 0.8 : 0.6,
      };
    });

    const products = await db.digitalProduct.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticPages, ...vendorPages, ...contentUrls, ...productPages];
  } catch {
    return staticPages;
  }
}
