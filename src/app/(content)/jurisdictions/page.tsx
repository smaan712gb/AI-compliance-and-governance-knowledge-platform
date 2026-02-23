import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { COUNTRIES } from "@/lib/constants/company-data";
import { Globe, AlertTriangle, FileText } from "lucide-react";

export const metadata = buildMetadata({
  title: "Regulatory Jurisdictions - Country-Level Compliance Tracking",
  description:
    "Explore AI governance and compliance regulations by jurisdiction. Track regulatory alerts, e-invoicing mandates, cybersecurity directives, and data privacy laws across 40+ countries.",
  path: "/jurisdictions",
});

// Render on-demand — DB not available during Docker build
export const dynamic = "force-dynamic";

const REGION_LABELS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  apac: "Asia-Pacific",
  mena: "Middle East & Africa",
};

const REGION_ORDER = ["europe", "americas", "apac", "mena"];

export default async function JurisdictionsPage() {
  // Fetch alert counts per jurisdiction
  const alertCounts = await db.regulatoryAlert.groupBy({
    by: ["jurisdiction"],
    where: { isActive: true },
    _count: { id: true },
  });

  const alertCountMap = new Map(
    alertCounts.map((a) => [a.jurisdiction, a._count.id]),
  );

  // Fetch blog post counts per category (jurisdiction-related)
  // We match content where the category field equals the country code
  // or the tags array contains the country code
  const allContentCounts = await db.contentPage.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED", category: { not: null } },
    _count: { id: true },
  });

  const contentCountMap = new Map(
    allContentCounts.map((c) => [c.category, c._count.id]),
  );

  // Group countries by region
  const countriesByRegion = REGION_ORDER.map((region) => ({
    region,
    label: REGION_LABELS[region],
    countries: COUNTRIES.filter((c) => c.region === region),
  }));

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Regulatory Jurisdictions
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Explore compliance requirements by country. Track regulatory alerts,
          e-invoicing mandates, cybersecurity directives, and data privacy laws.
        </p>
      </div>

      {REGION_ORDER.map((region) => {
        const group = countriesByRegion.find((g) => g.region === region);
        if (!group || group.countries.length === 0) return null;

        return (
          <section key={region} className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Globe className="h-5 w-5" />
              {group.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {group.countries.map((country) => {
                const alertCount = alertCountMap.get(country.value) || 0;
                const contentCount =
                  contentCountMap.get(country.value) || 0;

                return (
                  <Link
                    key={country.value}
                    href={`/jurisdictions/${country.value}`}
                  >
                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {country.label}
                            </h3>
                            <Badge variant="outline" className="mt-1">
                              {country.value}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>
                              {alertCount} active alert
                              {alertCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              {contentCount} related article
                              {contentCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
