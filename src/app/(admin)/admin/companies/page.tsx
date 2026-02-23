import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Globe, Server } from "lucide-react";
import { formatNumber, formatDateShort } from "@/lib/utils/format";
import { INDUSTRIES, ERP_SYSTEMS } from "@/lib/constants/company-data";

export const dynamic = "force-dynamic";

// Helper to look up label from constants
function getIndustryLabel(value: string): string {
  const found = INDUSTRIES.find((i) => i.value === value);
  return found ? found.label : value;
}

function getERPLabel(value: string): string {
  const found = ERP_SYSTEMS.find((e) => e.value === value);
  return found ? found.label : value || "None";
}

export default async function AdminCompaniesPage() {
  const [companies, totalCount, industryDistribution, sizeDistribution] =
    await Promise.all([
      db.companyProfile.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              subscription: { select: { stripePriceId: true, status: true } },
            },
          },
        },
      }),
      db.companyProfile.count(),
      db.companyProfile.groupBy({
        by: ["industry"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.companyProfile.groupBy({
        by: ["companySize"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

  // Determine tier from subscription
  function getTierLabel(
    subscription: { stripePriceId: string; status: string } | null,
  ): string {
    if (!subscription) return "Free";
    if (subscription.status !== "ACTIVE") return "Inactive";
    // Simplified tier detection from price ID
    const priceId = subscription.stripePriceId.toLowerCase();
    if (priceId.includes("enterprise") || priceId.includes("ent"))
      return "Enterprise";
    if (priceId.includes("professional") || priceId.includes("pro"))
      return "Professional";
    if (priceId.includes("starter") || priceId.includes("start"))
      return "Starter";
    return "Paid";
  }

  const tierVariant = (
    tier: string,
  ): "default" | "secondary" | "success" | "warning" => {
    switch (tier) {
      case "Enterprise":
        return "default";
      case "Professional":
        return "success";
      case "Starter":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Company Profiles</h1>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatNumber(totalCount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Top Industry
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {industryDistribution.length > 0
                ? getIndustryLabel(industryDistribution[0].industry)
                : "N/A"}
            </div>
            {industryDistribution.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {industryDistribution[0]._count.id} companies
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Industries
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {industryDistribution.length}
            </div>
            <p className="text-xs text-muted-foreground">
              unique industries represented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Size Distribution
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sizeDistribution.slice(0, 3).map((s) => (
                <div
                  key={s.companySize}
                  className="flex justify-between text-xs"
                >
                  <span className="text-muted-foreground">
                    {s.companySize}
                  </span>
                  <span className="font-medium">{s._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Industry Breakdown */}
      {industryDistribution.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {industryDistribution.map((ind) => (
                <Badge key={ind.industry} variant="secondary">
                  {getIndustryLabel(ind.industry)} ({ind._count.id})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies ({formatNumber(totalCount)})</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground">
              No company profiles created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">
                      Company Name
                    </th>
                    <th className="text-left py-2 font-medium">Industry</th>
                    <th className="text-left py-2 font-medium">HQ</th>
                    <th className="text-left py-2 font-medium">Countries</th>
                    <th className="text-left py-2 font-medium">ERP</th>
                    <th className="text-left py-2 font-medium">Size</th>
                    <th className="text-left py-2 font-medium">Tier</th>
                    <th className="text-left py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const tier = getTierLabel(company.user.subscription);

                    return (
                      <tr
                        key={company.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 font-medium">
                          <div>{company.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.user.email}
                          </div>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {getIndustryLabel(company.industry)}
                        </td>
                        <td className="py-2">{company.headquarters}</td>
                        <td className="py-2">
                          <Badge variant="outline">
                            {company.operatingCountries.length}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {getERPLabel(company.erpSystem || "")}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {company.companySize}
                        </td>
                        <td className="py-2">
                          <Badge variant={tierVariant(tier)}>{tier}</Badge>
                        </td>
                        <td className="py-2 text-muted-foreground whitespace-nowrap">
                          {formatDateShort(company.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
