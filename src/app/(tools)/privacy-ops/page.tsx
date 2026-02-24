import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Mail, FileText, Scale } from "lucide-react";

export const metadata = buildMetadata({
  title: "Privacy Operations Toolkit - DSAR, ROPA & DPA Review",
  description:
    "Complete privacy operations toolkit: generate DSAR responses, build ROPA entries, and review Data Processing Agreements for GDPR compliance.",
  path: "/privacy-ops",
});

export default function PrivacyOpsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            3 Privacy Tools
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Privacy Operations Toolkit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Automate your day-to-day privacy operations — from DSAR responses to ROPA entries
            to DPA reviews. Built by former DPA investigators and certified DPOs.
          </p>
        </div>

        {/* Three Tool Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="flex flex-col">
            <CardHeader>
              <Mail className="h-8 w-8 text-primary mb-2" />
              <CardTitle>DSAR Response Generator</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                Generate compliant DSAR responses for access, rectification, erasure,
                restriction, portability, and objection requests. Includes draft response
                letters, exemption analysis, and compliance checklists.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Free Access</Badge>
                <Badge variant="outline">GDPR Art 15-22</Badge>
              </div>
              <Link href="/privacy-ops/dsar">
                <Button className="w-full gap-2">
                  Generate DSAR Response
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>ROPA Generator</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                Build Article 30 Records of Processing Activities with all required fields,
                security measures, DPIA assessment, and risk analysis. Audit-ready documentation.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Starter+</Badge>
                <Badge variant="outline">GDPR Art 30</Badge>
              </div>
              <Link href="/privacy-ops/ropa">
                <Button variant="outline" className="w-full gap-2">
                  Build ROPA Entry
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <Scale className="h-8 w-8 text-primary mb-2" />
              <CardTitle>DPA Review</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                Paste any Data Processing Agreement and get a clause-by-clause compliance
                review against Art 28(3) requirements, risk assessment, and recommended amendments.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Starter+</Badge>
                <Badge variant="outline">GDPR Art 28</Badge>
              </div>
              <Link href="/privacy-ops/dpa-review">
                <Button variant="outline" className="w-full gap-2">
                  Review DPA
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="bg-primary rounded-lg p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-3">
            Privacy Operations on Autopilot
          </h2>
          <p className="mb-6 opacity-90">
            Stop spending hours on manual DSAR responses and ROPA spreadsheets.
          </p>
          <Link href="/privacy-ops/dsar">
            <Button variant="secondary" size="lg" className="gap-2">
              Try DSAR Generator Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
