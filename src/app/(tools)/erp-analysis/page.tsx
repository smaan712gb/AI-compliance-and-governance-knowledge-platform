import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Building2,
  ClipboardList,
  AlertTriangle,
  Globe,
  Zap,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "ERP Compliance Gap Analysis - Find Regulatory Gaps",
  description:
    "Identify regulatory compliance gaps in your ERP system. Get vendor recommendations, action plans, and deadline tracking for e-invoicing, tax, cybersecurity, and ESG mandates across 40+ jurisdictions.",
  path: "/erp-analysis",
});

export default function ERPAnalysisPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="warning" className="mb-4">
            Professional Tier Feature
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            ERP Compliance Gap Analysis
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Discover which regulatory mandates your ERP system does not cover
            natively. Get a prioritized gap report with vendor recommendations,
            deadline tracking, and a concrete action plan tailored to your
            operating countries and industry.
          </p>
          <div className="mt-8">
            <Link href="/erp-analysis/wizard">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Start Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Requires a Professional or Enterprise subscription. Takes 2-3
            minutes.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            What You Get
          </h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
                <h3 className="font-semibold mb-2">Gap Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Cross-reference your ERP system against every applicable
                  regulation for your jurisdictions and industry. See which
                  mandates are covered natively, via add-ons, via partners, or
                  not at all.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Building2 className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">Vendor Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  For every gap, receive specific vendor recommendations from
                  our database of 80+ compliance tools, including e-invoicing
                  providers, GRC platforms, and cybersecurity solutions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <ClipboardList className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold mb-2">Action Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Get a phased implementation plan with deadlines, budget
                  estimates, and priority rankings so your team knows exactly
                  what to tackle first and how much lead time you have.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-4 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                icon: <Zap className="h-6 w-6" />,
                title: "Select Your ERP",
                description:
                  "Choose from SAP, Oracle, Dynamics 365, NetSuite, Workday, Sage, and more.",
              },
              {
                step: "2",
                icon: <Globe className="h-6 w-6" />,
                title: "Set Your Jurisdictions",
                description:
                  "Pick every country where you operate so we apply the right regulations.",
              },
              {
                step: "3",
                icon: <Building2 className="h-6 w-6" />,
                title: "Choose Your Industry",
                description:
                  "Industry-specific mandates like DORA for finance or NIS2 for energy are factored in.",
              },
              {
                step: "4",
                icon: <ShieldCheck className="h-6 w-6" />,
                title: "Get Your Report",
                description:
                  "Receive a detailed gap analysis, vendor matches, and a prioritized action plan.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-3">
                  {item.icon}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold">
            Ready to Find Your Compliance Gaps?
          </h2>
          <p className="mt-3 opacity-90 max-w-lg mx-auto">
            Stop guessing which mandates your ERP misses. Get a clear picture in
            minutes, not months.
          </p>
          <div className="mt-6">
            <Link href="/erp-analysis/wizard">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
