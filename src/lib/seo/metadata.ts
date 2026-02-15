import type { Metadata } from "next";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "AIGovHub";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aigovhub.com";

export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  type = "website",
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const image = ogImage || `${SITE_URL}/images/og/default.png`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}

export const defaultMetadata: Metadata = {
  title: {
    default: `${SITE_NAME} - AI Governance & Compliance Automation`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "The AI Compliance & Trust Stack Knowledge Engine. Free AI Act compliance checker, vendor risk questionnaires, and compliance automation tools.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
};
