import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Star,
  ExternalLink,
  CheckCircle,
  XCircle,
  Globe,
  Building2,
  Users,
  Calendar,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const vendors = await db.vendor.findMany({
      where: { isPublished: true },
      select: { slug: true },
    });
    return vendors.map((v) => ({ slug: v.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({ where: { slug } });
  if (!vendor) return {};

  return buildMetadata({
    title: `${vendor.name} Review - AI Governance Platform`,
    description:
      vendor.metaDescription ||
      vendor.shortDescription ||
      `${vendor.name} review: features, pricing, frameworks supported, and more.`,
    path: `/vendors/${slug}`,
  });
}

export default async function VendorDetailPage({ params }: Props) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({
    where: { slug, isPublished: true },
  });

  if (!vendor) notFound();

  const scores = [
    { label: "Overall", value: vendor.overallScore },
    { label: "Ease of Use", value: vendor.easeOfUse },
    { label: "Features", value: vendor.featureRichness },
    { label: "Value", value: vendor.valueForMoney },
    { label: "Support", value: vendor.customerSupport },
  ].filter((s) => s.value !== null);

  const prosConsData = vendor.prosConsList as {
    pros?: string[];
    cons?: string[];
  } | null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.name}
              className="h-16 w-16 rounded-lg object-contain"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {vendor.name.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{vendor.name}</h1>
              {vendor.isFeatured && <Badge>Featured</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 capitalize">
              {vendor.category.replace(/_/g, " ").toLowerCase()}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {vendor.headquarters && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {vendor.headquarters}
                </span>
              )}
              {vendor.foundedYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Founded {vendor.foundedYear}
                </span>
              )}
              {vendor.employeeCount && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {vendor.employeeCount} employees
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {vendor.affiliateUrl ? (
              <a href={vendor.affiliateUrl} target="_blank" rel="noopener sponsored">
                <Button className="gap-2">
                  Visit Website
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : (
              <a href={vendor.websiteUrl} target="_blank" rel="noopener">
                <Button variant="outline" className="gap-2">
                  Visit Website
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Scores */}
        {scores.length > 0 && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            {scores.map((score) => (
              <Card key={score.label} className="text-center">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-xl font-bold">
                      {score.value?.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{score.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{vendor.description}</p>
          </CardContent>
        </Card>

        <div className="grid gap-8 md:grid-cols-2 mb-8">
          {/* Frameworks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frameworks Supported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {vendor.frameworksSupported.map((fw) => (
                  <Badge key={fw} variant="secondary">
                    {fw}
                  </Badge>
                ))}
                {vendor.frameworksSupported.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Not specified
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: "SOC 2 Certified", value: vendor.soc2Certified },
                  { label: "ISO 27001 Certified", value: vendor.iso27001Certified },
                  { label: "GDPR Compliant", value: vendor.gdprCompliant },
                  { label: "DPA Available", value: vendor.hasDPA },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    {item.value ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pros & Cons */}
        {prosConsData && (
          <div className="grid gap-8 md:grid-cols-2 mb-8">
            {prosConsData.pros && prosConsData.pros.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">Pros</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prosConsData.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {prosConsData.cons && prosConsData.cons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Cons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prosConsData.cons.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Pricing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="capitalize">
                {vendor.pricingModel.replace(/_/g, " ").toLowerCase()}
              </Badge>
              {vendor.pricingStartsAt && (
                <span className="font-medium">
                  Starting at {vendor.pricingStartsAt}
                </span>
              )}
              {vendor.hasFreeTrialOrTier && (
                <Badge variant="success">Free Trial/Tier Available</Badge>
              )}
            </div>
            {vendor.pricingDetails && (
              <p className="text-sm text-muted-foreground mt-3">
                {vendor.pricingDetails}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Disclosure */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          Some links on this page may be affiliate links. This means we may
          earn a commission if you make a purchase, at no additional cost to
          you. See our{" "}
          <a href="/disclosure" className="underline">
            affiliate disclosure
          </a>
          . Last verified:{" "}
          {vendor.lastVerifiedAt
            ? new Date(vendor.lastVerifiedAt).toLocaleDateString()
            : "Pending"}
        </p>
      </div>
    </div>
  );
}
