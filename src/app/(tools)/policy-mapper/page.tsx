import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  GitCompare,
  ClipboardCheck,
  Target,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "Policy-to-Control Mapping Tool - Cross-Framework Compliance",
  description:
    "Map your security policies to NIST CSF 2.0, ISO 27001, SOC 2, PCI DSS 4.0, DORA, NIS2, HIPAA, EU AI Act, and GDPR controls. Identify gaps and cross-framework overlaps instantly.",
  path: "/policy-mapper",
});

export default function PolicyMapperPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            9 Frameworks Supported
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Policy-to-Control Mapping
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Map your security policies across NIST CSF 2.0, ISO 27001, SOC 2,
            PCI DSS 4.0, DORA, NIS2, HIPAA, EU AI Act, and GDPR — with
            cross-framework overlap analysis and gap identification.
          </p>
          <Link href="/policy-mapper/wizard">
            <Button size="lg" className="gap-2">
              Start Mapping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* How It Works */}
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            {
              step: "1",
              title: "Select Frameworks",
              description: "Choose which compliance frameworks apply to your organization",
            },
            {
              step: "2",
              title: "Define Scope",
              description: "Select a policy domain or paste your existing policy text",
            },
            {
              step: "3",
              title: "Add Context",
              description: "Provide industry and company size for tailored mapping",
            },
            {
              step: "4",
              title: "Get Mapping",
              description: "Receive control mappings, overlaps, gaps, and remediation plan",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* What You Get */}
        <h2 className="text-2xl font-bold text-center mb-8">What You Get</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <GitCompare className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Cross-Framework Overlaps</h3>
              <p className="text-sm text-muted-foreground">
                See how one control implementation satisfies multiple frameworks simultaneously —
                reduce audit burden by up to 60%.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Target className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Gap Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Identify critical, high, and medium gaps between your current posture and
                framework requirements with specific control IDs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Remediation Plan</h3>
              <p className="text-sm text-muted-foreground">
                Prioritized action items organized by timeline: immediate (0–30 days),
                short-term (30–90), and medium-term (90–180).
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <ClipboardCheck className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Evidence Checklist</h3>
              <p className="text-sm text-muted-foreground">
                Specific audit artifacts needed: policy documents, technical evidence,
                process evidence, and third-party attestations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="bg-primary rounded-lg p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-3">
            Stop Managing Compliance in Spreadsheets
          </h2>
          <p className="mb-6 opacity-90">
            Get your cross-framework control mapping in minutes, not weeks.
          </p>
          <Link href="/policy-mapper/wizard">
            <Button variant="secondary" size="lg" className="gap-2">
              Start Free Mapping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
