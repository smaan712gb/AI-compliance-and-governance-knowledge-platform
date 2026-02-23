import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
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
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Globe,
  Building2,
  FileText,
  ExternalLink,
  Scale,
  ShieldAlert,
} from "lucide-react";

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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AlertDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  // Get company profile
  const company = await db.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!company) {
    redirect("/dashboard/company");
  }

  // Fetch the CompanyAlert
  const companyAlert = await db.companyAlert.findUnique({
    where: { id },
    include: { alert: true },
  });

  if (!companyAlert || companyAlert.companyId !== company.id) {
    notFound();
  }

  const alert = companyAlert.alert;
  const urgencyStyle = URGENCY_STYLES[alert.urgency] || URGENCY_STYLES.LOW;

  // Mark as read on visit (fire-and-forget)
  if (!companyAlert.isRead) {
    db.companyAlert
      .update({ where: { id }, data: { isRead: true } })
      .catch(() => {
        // Silently fail — reading status is non-critical
      });
  }

  return (
    <div className="max-w-3xl">
      {/* Back Button */}
      <Link href="/dashboard/alerts">
        <Button variant="ghost" size="sm" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Alerts
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge
            variant={urgencyStyle.variant}
            className={`text-sm px-3 py-1 ${urgencyStyle.className || ""}`}
          >
            {alert.urgency}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {DOMAIN_LABELS[alert.domain] || alert.domain}
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {alert.changeType}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">{alert.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Published {formatDate(alert.createdAt)}
        </p>
      </div>

      {/* Meta Information */}
      <Card className="mb-6">
        <CardContent className="grid gap-4 sm:grid-cols-2 py-6">
          <div className="flex items-start gap-3">
            <Scale className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Regulation</p>
              <p className="text-sm text-muted-foreground">{alert.regulation}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Regulatory Body</p>
              <p className="text-sm text-muted-foreground">{alert.regulatoryBody}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Jurisdiction</p>
              <p className="text-sm text-muted-foreground">{alert.jurisdiction}</p>
            </div>
          </div>
          {alert.effectiveDate && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Effective Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(alert.effectiveDate)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {alert.summary}
          </p>
        </CardContent>
      </Card>

      {/* Action Required */}
      {alert.actionRequired && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-orange-900 dark:text-orange-200">
              {alert.actionRequired}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Affected Scope */}
      {(alert.affectedIndustries.length > 0 || alert.affectedCountries.length > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Affected Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alert.affectedIndustries.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Industries</p>
                <div className="flex flex-wrap gap-2">
                  {alert.affectedIndustries.map((industry) => (
                    <Badge key={industry} variant="secondary" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {alert.affectedCountries.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Countries</p>
                <div className="flex flex-wrap gap-2">
                  {alert.affectedCountries.map((country) => (
                    <Badge key={country} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Source Link */}
      {alert.sourceUrl && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Source Document</span>
            </div>
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                Open Source <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Back Button (bottom) */}
      <div className="pt-4 border-t">
        <Link href="/dashboard/alerts">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Alerts
          </Button>
        </Link>
      </div>
    </div>
  );
}
