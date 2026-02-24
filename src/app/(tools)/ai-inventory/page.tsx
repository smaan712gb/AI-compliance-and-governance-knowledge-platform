import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Brain, Shield, BarChart3, FileSearch } from "lucide-react";

export const metadata = buildMetadata({
  title: "AI System Inventory & Model Risk - EU AI Act Compliance",
  description:
    "Register, classify, and monitor all AI systems in your organization. EU AI Act risk classification, model risk assessment, and governance recommendations.",
  path: "/ai-inventory",
});

export default function AIInventoryPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            EU AI Act Compliant
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            AI System Inventory & Model Risk
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Register all AI systems in your organization, classify them under the EU AI Act,
            and get AI-powered risk assessments and governance recommendations.
          </p>
          <Link href="/dashboard/ai-inventory">
            <Button size="lg" className="gap-2">
              Go to Inventory Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <Brain className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">AI System Registry</h3>
              <p className="text-sm text-muted-foreground">
                Centralized inventory of all AI/ML systems with model type, provider,
                data classification, and deployment status tracking.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">EU AI Act Classification</h3>
              <p className="text-sm text-muted-foreground">
                Automatic risk classification (Unacceptable, High, Limited, Minimal, GPAI)
                with specific Annex III and article references.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <BarChart3 className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Model Risk Assessment</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis of data risk, output risk, bias risk, and security risk
                with monitoring recommendations.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileSearch className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Compliance Documentation</h3>
              <p className="text-sm text-muted-foreground">
                Generated documentation checklist per Art 11, human oversight assessment,
                and governance recommendations.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-primary rounded-lg p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-3">
            EU AI Act Compliance Starts with Knowing What You Have
          </h2>
          <p className="mb-6 opacity-90">
            Article 6 requires organizations to classify and document all AI systems.
            Start your inventory today.
          </p>
          <Link href="/dashboard/ai-inventory">
            <Button variant="secondary" size="lg" className="gap-2">
              Start Inventory
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
