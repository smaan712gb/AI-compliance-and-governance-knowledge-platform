export function productSchema(product: {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: (product.currency || "usd").toUpperCase(),
      availability: "https://schema.org/InStock",
    },
  };
}

export function softwareApplicationSchema(vendor: {
  name: string;
  websiteUrl: string;
  overallScore?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: vendor.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: vendor.websiteUrl,
    ...(vendor.overallScore && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: vendor.overallScore,
        bestRating: 10,
        worstRating: 1,
      },
    }),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleSchema(page: {
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | null;
  updatedAt: Date;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.excerpt,
    datePublished: page.publishedAt?.toISOString(),
    dateModified: page.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "AIGovHub" },
  };
}

export function breadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
