export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";

export const metadata = buildMetadata({
  title: "AI Governance Vendor Tracker - Compare Tools & Platforms",
  description:
    "Compare 30+ AI governance, compliance, and risk management tools. Filter by framework, pricing, and features. Updated weekly.",
  path: "/vendors",
});

export const revalidate = 1800; // 30 min ISR

export default async function VendorTrackerPage() {
  const vendors = await db.vendor.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { overallScore: "desc" }, { name: "asc" }],
  });

  const categories = [...new Set(vendors.map((v) => v.category))];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">AI Governance Vendor Tracker</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          A living database of AI governance, compliance, and risk management
          tools. Compare features, pricing, frameworks, and more.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {vendors.length} vendors tracked &middot; Updated weekly
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <Badge variant="default" className="cursor-pointer">
          All ({vendors.length})
        </Badge>
        {categories.map((cat) => (
          <Badge key={cat} variant="outline" className="cursor-pointer">
            {cat.replace(/_/g, " ")} (
            {vendors.filter((v) => v.category === cat).length})
          </Badge>
        ))}
      </div>

      {/* Vendor Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <Link key={vendor.id} href={`/vendors/${vendor.slug}`}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {vendor.logoUrl ? (
                      <img
                        src={vendor.logoUrl}
                        alt={vendor.name}
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {vendor.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {vendor.category.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                  </div>
                  {vendor.overallScore && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">
                        {vendor.overallScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {vendor.shortDescription || vendor.description}
                </p>

                {/* Frameworks */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {vendor.frameworksSupported.slice(0, 4).map((fw) => (
                    <Badge key={fw} variant="secondary" className="text-xs">
                      {fw}
                    </Badge>
                  ))}
                  {vendor.frameworksSupported.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{vendor.frameworksSupported.length - 4}
                    </Badge>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {vendor.pricingStartsAt || vendor.pricingModel.replace(/_/g, " ")}
                  </span>
                  {vendor.hasFreeTrialOrTier && (
                    <Badge variant="success" className="text-xs">
                      Free Tier
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Vendor database is being populated. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
