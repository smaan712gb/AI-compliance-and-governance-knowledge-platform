import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Shield,
  Globe,
  Clock,
  Building2,
  ExternalLink,
} from "lucide-react";
import { formatNumber, formatDateShort } from "@/lib/utils/format";
import { COMPLIANCE_DOMAINS } from "@/lib/constants/company-data";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ urgency?: string; domain?: string }>;
}

function getDomainLabel(value: string): string {
  const found = COMPLIANCE_DOMAINS.find((d) => d.value === value);
  return found ? found.label : value;
}

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

export default async function AdminAlertsPage({ searchParams }: Props) {
  const { urgency: filterUrgency, domain: filterDomain } = await searchParams;

  // Build where clause from filters
  const where: Record<string, unknown> = { isActive: true };
  if (filterUrgency) where.urgency = filterUrgency;
  if (filterDomain) where.domain = filterDomain;

  const [
    alerts,
    totalCount,
    urgencyDistribution,
    domainDistribution,
  ] = await Promise.all([
    db.regulatoryAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: { select: { companies: true } },
      },
    }),
    db.regulatoryAlert.count({ where: { isActive: true } }),
    db.regulatoryAlert.groupBy({
      by: ["urgency"],
      where: { isActive: true },
      _count: { id: true },
    }),
    db.regulatoryAlert.groupBy({
      by: ["domain"],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Build urgency counts map
  const urgencyCounts: Record<string, number> = {};
  for (const u of urgencyDistribution) {
    urgencyCounts[u.urgency] = u._count.id;
  }

  // All unique domains and urgencies for filter dropdowns
  const allDomains = domainDistribution.map((d) => d.domain);
  const allUrgencies = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Regulatory Alerts</h1>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
              Critical
            </CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              {formatNumber(urgencyCounts["CRITICAL"] || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              High
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">
              {formatNumber(urgencyCounts["HIGH"] || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Medium
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatNumber(urgencyCounts["MEDIUM"] || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Low
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-muted-foreground">
              {formatNumber(urgencyCounts["LOW"] || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain Distribution */}
      {domainDistribution.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm">Distribution by Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {domainDistribution.map((d) => (
                <Badge key={d.domain} variant="secondary">
                  {getDomainLabel(d.domain)} ({d._count.id})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="urgency"
                className="block text-sm font-medium mb-1"
              >
                Urgency
              </label>
              <select
                id="urgency"
                name="urgency"
                defaultValue={filterUrgency || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Urgencies</option>
                {allUrgencies.map((u) => (
                  <option key={u} value={u}>
                    {u} ({urgencyCounts[u] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="domain"
                className="block text-sm font-medium mb-1"
              >
                Domain
              </label>
              <select
                id="domain"
                name="domain"
                defaultValue={filterDomain || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Domains</option>
                {allDomains.map((d) => (
                  <option key={d} value={d}>
                    {getDomainLabel(d)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 h-10"
            >
              Filter
            </button>

            {(filterUrgency || filterDomain) && (
              <a
                href="/admin/alerts"
                className="text-sm text-muted-foreground hover:text-primary underline h-10 flex items-center"
              >
                Clear Filters
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alerts
            {filterUrgency || filterDomain
              ? ` (filtered: ${alerts.length})`
              : ` (${formatNumber(totalCount)})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">
              No alerts found matching the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Title</th>
                    <th className="text-left py-2 font-medium">Regulation</th>
                    <th className="text-left py-2 font-medium">Jurisdiction</th>
                    <th className="text-left py-2 font-medium">Urgency</th>
                    <th className="text-left py-2 font-medium">Domain</th>
                    <th className="text-left py-2 font-medium">Change Type</th>
                    <th className="text-left py-2 font-medium">Companies</th>
                    <th className="text-left py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 max-w-xs">
                        <div className="font-medium truncate">
                          {alert.title}
                        </div>
                        {alert.sourceUrl && (
                          <a
                            href={alert.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            Source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {alert.regulation}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{alert.jurisdiction}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={urgencyVariant(alert.urgency)}>
                          {alert.urgency}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          {getDomainLabel(alert.domain)}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {alert.changeType}
                      </td>
                      <td className="py-2 text-center">
                        {alert._count.companies > 0 ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {alert._count.companies}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">
                        {formatDateShort(alert.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
