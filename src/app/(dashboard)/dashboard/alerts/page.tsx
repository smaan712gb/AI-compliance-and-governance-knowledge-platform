import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { checkFeatureAccess } from "@/lib/feature-gating";
import { formatDate } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Bell,
  BellOff,
  AlertTriangle,
  ArrowRight,
  Building2,
  Shield,
  ExternalLink,
  Calendar,
  Crown,
} from "lucide-react";

const URGENCY_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const URGENCY_STYLES: Record<string, { variant: "destructive" | "warning" | "secondary" | "default"; className?: string }> = {
  CRITICAL: { variant: "destructive" },
  HIGH: { variant: "destructive", className: "bg-orange-500 hover:bg-orange-500/80" },
  MEDIUM: { variant: "warning" },
  LOW: { variant: "default", className: "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-transparent" },
};

const DOMAIN_LABELS: Record<string, string> = {
  "ai-governance": "AI Governance",
  "e-invoicing": "E-Invoicing",
  "tax-compliance": "Tax Compliance",
  "cybersecurity": "Cybersecurity",
  "data-privacy": "Data Privacy",
  "esg": "ESG",
  "fintech": "Fintech",
  "hr-compliance": "HR Compliance",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{
    urgency?: string;
    domain?: string;
    read?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const filterUrgency = params.urgency || undefined;
  const filterDomain = params.domain || undefined;
  const filterRead = params.read || undefined;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 12;

  // Check feature access
  const access = await checkFeatureAccess(session.user.id, "alerts");

  // Get company profile
  const company = await db.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  // If no feature access, show upgrade CTA
  if (!access.allowed) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Regulatory Alerts
        </h1>
        <Card className="max-w-lg">
          <CardContent className="flex flex-col items-center text-center py-12 px-6">
            <Crown className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Upgrade to Access Alerts</h2>
            <p className="text-muted-foreground mb-6">
              Regulatory alerts are available on the Starter plan and above.
              Get personalized alerts based on your company profile, industry,
              and compliance domains.
            </p>
            <Link href="/pricing">
              <Button className="gap-2">
                View Plans <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no company profile, show onboarding prompt
  if (!company) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Regulatory Alerts
        </h1>
        <Card className="max-w-lg">
          <CardContent className="flex flex-col items-center text-center py-12 px-6">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Complete Your Company Profile</h2>
            <p className="text-muted-foreground mb-6">
              Set up your company profile to receive personalized regulatory alerts
              based on your industry, jurisdictions, and compliance domains.
            </p>
            <Link href="/dashboard/company">
              <Button className="gap-2">
                Set Up Profile <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build query filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    companyId: company.id,
    isDismissed: false,
    alert: { isActive: true },
  };

  if (filterRead === "true") where.isRead = true;
  if (filterRead === "false") where.isRead = false;
  if (filterDomain) where.alert.domain = filterDomain;
  if (filterUrgency) where.alert.urgency = filterUrgency;

  // Fetch data
  const [total, unreadCount, companyAlerts] = await Promise.all([
    db.companyAlert.count({ where }),
    db.companyAlert.count({
      where: {
        companyId: company.id,
        isDismissed: false,
        isRead: false,
        alert: { isActive: true },
      },
    }),
    db.companyAlert.findMany({
      where,
      include: { alert: true },
      orderBy: { alert: { createdAt: "desc" } },
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get unique domains from company's compliance domains for filter badges
  const companyDomains = company.complianceDomains || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Regulatory Alerts
          </h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Link href="/dashboard/company">
          <Button variant="outline" size="sm" className="gap-1">
            <Building2 className="h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Urgency Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/dashboard/alerts">
          <Badge
            variant={!filterUrgency ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-sm"
          >
            All
          </Badge>
        </Link>
        {URGENCY_LEVELS.map((level) => {
          const isActive = filterUrgency === level;
          const style = URGENCY_STYLES[level];
          const searchP = new URLSearchParams();
          searchP.set("urgency", level);
          if (filterDomain) searchP.set("domain", filterDomain);

          return (
            <Link key={level} href={`/dashboard/alerts?${searchP.toString()}`}>
              <Badge
                variant={isActive ? style.variant : "outline"}
                className={`cursor-pointer px-3 py-1 text-sm ${isActive ? (style.className || "") : ""}`}
              >
                {level.charAt(0) + level.slice(1).toLowerCase()}
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Domain Filter Badges */}
      {companyDomains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={
              filterUrgency
                ? `/dashboard/alerts?urgency=${filterUrgency}`
                : "/dashboard/alerts"
            }
          >
            <Badge
              variant={!filterDomain ? "secondary" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
            >
              All Domains
            </Badge>
          </Link>
          {companyDomains.map((domain) => {
            const searchP = new URLSearchParams();
            searchP.set("domain", domain);
            if (filterUrgency) searchP.set("urgency", filterUrgency);

            return (
              <Link key={domain} href={`/dashboard/alerts?${searchP.toString()}`}>
                <Badge
                  variant={filterDomain === domain ? "secondary" : "outline"}
                  className="cursor-pointer px-3 py-1 text-sm"
                >
                  {DOMAIN_LABELS[domain] || domain}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {/* Alert Cards Grid */}
      {companyAlerts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companyAlerts.map((ca) => {
            const alert = ca.alert;
            const urgencyStyle = URGENCY_STYLES[alert.urgency] || URGENCY_STYLES.LOW;

            return (
              <Link
                key={ca.id}
                href={`/dashboard/alerts/${ca.id}`}
              >
                <Card
                  className={`h-full hover:border-primary transition-colors cursor-pointer ${
                    !ca.isRead ? "border-l-4 border-l-primary" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={urgencyStyle.variant}
                          className={urgencyStyle.className || ""}
                        >
                          {alert.urgency}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {DOMAIN_LABELS[alert.domain] || alert.domain}
                        </Badge>
                      </div>
                      {!ca.isRead ? (
                        <Bell className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {alert.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.regulation}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {alert.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {alert.effectiveDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(alert.effectiveDate)}
                        </span>
                      )}
                      <span>{formatDate(alert.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Alerts Found</h2>
            <p className="text-muted-foreground max-w-md">
              {filterUrgency || filterDomain
                ? "No alerts match your current filters. Try adjusting the urgency or domain filters."
                : "You have no regulatory alerts yet. Alerts are generated when regulatory changes affect your company profile."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={(() => {
                const sp = new URLSearchParams();
                sp.set("page", String(currentPage - 1));
                if (filterUrgency) sp.set("urgency", filterUrgency);
                if (filterDomain) sp.set("domain", filterDomain);
                return `/dashboard/alerts?${sp.toString()}`;
              })()}
            >
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={(() => {
                const sp = new URLSearchParams();
                sp.set("page", String(currentPage + 1));
                if (filterUrgency) sp.set("urgency", filterUrgency);
                if (filterDomain) sp.set("domain", filterDomain);
                return `/dashboard/alerts?${sp.toString()}`;
              })()}
            >
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
