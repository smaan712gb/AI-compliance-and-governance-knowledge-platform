import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Users, TrendingUp } from "lucide-react";

export const metadata = buildMetadata({
  title: "Board & Audit Committee Report Generator - CISO Reporting",
  description:
    "Generate board-ready cybersecurity reports, CISO quarterly briefings, and audit committee presentations with KRIs, risk dashboards, and actionable recommendations.",
  path: "/board-report",
});

export default function BoardReportPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Professional+ Plan
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Board & Audit Committee Report Generator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Generate board-ready cybersecurity reports with KRI dashboards,
            risk posture analysis, and executive recommendations — the way
            Big Four advisory partners prepare them.
          </p>
          <Link href="/board-report/wizard">
            <Button size="lg" className="gap-2">
              Generate Report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">Report Types</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <BarChart3 className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Quarterly CISO Report</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive security posture update with KRIs, threat landscape,
                compliance status, and budget analysis.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Annual Risk Report</h3>
              <p className="text-sm text-muted-foreground">
                Year-end risk landscape assessment with year-over-year trends,
                program maturity evolution, and strategic outlook.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Audit Committee Briefing</h3>
              <p className="text-sm text-muted-foreground">
                Compliance and control effectiveness reporting aligned with
                SEC Reg S-K Item 106(c) governance disclosure requirements.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Incident & Regulatory Briefs</h3>
              <p className="text-sm text-muted-foreground">
                Ad-hoc board briefings for major incidents or significant
                regulatory changes requiring board-level awareness.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-primary rounded-lg p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-3">
            Board-Ready in Minutes, Not Days
          </h2>
          <p className="mb-6 opacity-90">
            Aggregates your regulatory alerts, vendor assessments, risk register, and AI inventory
            into professional board presentations.
          </p>
          <Link href="/board-report/wizard">
            <Button variant="secondary" size="lg" className="gap-2">
              Generate Your First Report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
