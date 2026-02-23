import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/format";
import { COUNTRIES } from "@/lib/constants/company-data";
import {
  getRegulationsByJurisdiction,
} from "@/lib/constants/erp-data";
import {
  Globe,
  AlertTriangle,
  FileText,
  Calendar,
  ArrowRight,
  Shield,
  ExternalLink,
} from "lucide-react";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  try {
    return COUNTRIES.map((c) => ({ code: c.value }));
  } catch {
    return [];
  }
}

export const revalidate = 86400;

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const country = COUNTRIES.find((c) => c.value === code);
  if (!country) return {};

  return buildMetadata({
    title: `${country.label} Regulatory Compliance - Regulations, Alerts & Analysis`,
    description: `Track regulatory compliance requirements in ${country.label}. View active alerts, applicable regulations, e-invoicing mandates, and related articles for ${country.value}.`,
    path: `/jurisdictions/${code}`,
  });
}

const REGION_LABELS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  apac: "Asia-Pacific",
  mena: "Middle East & Africa",
};

const urgencyVariant = (
  urgency: string,
): "destructive" | "warning" | "secondary" | "default" => {
  switch (urgency.toUpperCase()) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "secondary";
    case "LOW":
      return "default";
    default:
      return "secondary";
  }
};

export default async function JurisdictionDetailPage({ params }: Props) {
  const { code } = await params;

  const country = COUNTRIES.find((c) => c.value === code);
  if (!country) notFound();

  // Fetch regulatory alerts for this jurisdiction
  const alerts = await db.regulatoryAlert.findMany({
    where: {
      jurisdiction: code,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      _count: { select: { companies: true } },
    },
  });

  // Fetch related blog posts (where category or tags match the country code)
  const relatedArticles = await db.contentPage.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { category: code },
        { tags: { has: code } },
        { tags: { has: country.label } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      excerpt: true,
      publishedAt: true,
      tags: true,
    },
  });

  // Get static regulation data for this jurisdiction
  const applicableRegulations = getRegulationsByJurisdiction(code);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/jurisdictions"
          className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block"
        >
          &larr; All Jurisdictions
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <Globe className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{country.label}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{country.value}</Badge>
              <Badge variant="secondary">
                {REGION_LABELS[country.region] || country.region}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{alerts.length}</div>
            <div className="text-sm text-muted-foreground">Active Alerts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">
              {applicableRegulations.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Tracked Regulations
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{relatedArticles.length}</div>
            <div className="text-sm text-muted-foreground">
              Related Articles
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applicable Regulations */}
      {applicableRegulations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Regulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {applicableRegulations.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-md border p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{reg.name}</h3>
                    <Badge variant="secondary">{reg.domain}</Badge>
                  </div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-2">
                    {reg.requirements.slice(0, 3).map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                    {reg.requirements.length > 3 && (
                      <li className="text-xs">
                        +{reg.requirements.length - 3} more requirements
                      </li>
                    )}
                  </ul>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {reg.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deadline: {reg.deadline}
                      </span>
                    )}
                    {reg.penalties && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {reg.penalties.length > 80
                          ? reg.penalties.slice(0, 80) + "..."
                          : reg.penalties}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Regulatory Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active regulatory alerts for {country.label}. Alerts are
              generated automatically when regulatory changes are detected.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-md border p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm">{alert.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={urgencyVariant(alert.urgency)}>
                        {alert.urgency}
                      </Badge>
                      <Badge variant="secondary">{alert.domain}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {alert.summary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{alert.regulation}</span>
                    <span>{alert.regulatoryBody}</span>
                    <span>{formatDate(alert.createdAt)}</span>
                    {alert._count.companies > 0 && (
                      <span>
                        {alert._count.companies} matched compan
                        {alert._count.companies === 1 ? "y" : "ies"}
                      </span>
                    )}
                    {alert.sourceUrl && (
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Related Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatedArticles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No articles specifically tagged for {country.label} yet. Check
              our{" "}
              <Link href="/blog" className="text-primary hover:underline">
                blog
              </Link>{" "}
              for general compliance coverage.
            </p>
          ) : (
            <div className="space-y-4">
              {relatedArticles.map((article) => {
                const typePathMap: Record<string, string> = {
                  BLOG_POST: "blog",
                  GUIDE: "guides",
                  BEST_OF: "best",
                  COMPARISON: "compare",
                  ALTERNATIVES: "alternatives",
                };
                const basePath = typePathMap[article.type] || "blog";

                return (
                  <Link
                    key={article.id}
                    href={`/${basePath}/${article.slug}`}
                    className="block rounded-md border p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {article.type.replace("_", " ")}
                          </Badge>
                          {article.publishedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(article.publishedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
