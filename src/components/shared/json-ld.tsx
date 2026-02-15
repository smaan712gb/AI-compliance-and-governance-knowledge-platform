import {
  productSchema,
  softwareApplicationSchema,
  faqSchema,
  articleSchema,
  breadcrumbSchema,
} from "@/lib/seo/structured-data";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ProductJsonLd(props: Parameters<typeof productSchema>[0]) {
  return <JsonLd data={productSchema(props)} />;
}

export function SoftwareApplicationJsonLd(
  props: Parameters<typeof softwareApplicationSchema>[0]
) {
  return <JsonLd data={softwareApplicationSchema(props)} />;
}

export function FaqJsonLd(props: Parameters<typeof faqSchema>[0]) {
  return <JsonLd data={faqSchema(props)} />;
}

export function ArticleJsonLd(props: Parameters<typeof articleSchema>[0]) {
  return <JsonLd data={articleSchema(props)} />;
}

export function BreadcrumbJsonLd(props: Parameters<typeof breadcrumbSchema>[0]) {
  return <JsonLd data={breadcrumbSchema(props)} />;
}
