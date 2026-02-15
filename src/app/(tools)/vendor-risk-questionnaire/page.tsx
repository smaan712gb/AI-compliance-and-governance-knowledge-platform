import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  FileCheck,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Download,
  Shield,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "AI Vendor Risk Questionnaire Generator - Free Tool",
  description:
    "Generate tailored AI vendor risk assessment questionnaires. Identify red flags, map to SOC 2/ISO 27001, and export as PDF or DOCX.",
  path: "/vendor-risk-questionnaire",
});

export default function QuestionnaireToolPage() {
  return (
    <>
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            AI Vendor Due Diligence
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI Vendor Risk Questionnaire Generator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Generate comprehensive, tailored vendor risk questionnaires for any
            AI system. Identify red flags, required artifacts, and map to
            SOC 2, ISO 27001, and more.
          </p>
          <div className="mt-8">
            <Link href="/vendor-risk-questionnaire/generator">
              <Button size="lg" className="gap-2">
                <FileCheck className="h-5 w-5" />
                Generate Questionnaire
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Free tool. No signup required.
          </p>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            What the Questionnaire Covers
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: <Shield className="h-6 w-6" />,
                title: "AI Model Governance",
                items: [
                  "Model cards & documentation",
                  "Version control",
                  "Testing & validation",
                ],
              },
              {
                icon: <AlertTriangle className="h-6 w-6" />,
                title: "Data Handling & Privacy",
                items: [
                  "Training data provenance",
                  "PII processing",
                  "Data residency & retention",
                ],
              },
              {
                icon: <CheckCircle className="h-6 w-6" />,
                title: "Security & Infrastructure",
                items: [
                  "Encryption standards",
                  "Access controls",
                  "Penetration testing",
                ],
              },
              {
                icon: <FileCheck className="h-6 w-6" />,
                title: "Bias & Fairness",
                items: [
                  "Bias testing methodology",
                  "Fairness metrics",
                  "Ongoing monitoring",
                ],
              },
              {
                icon: <Download className="h-6 w-6" />,
                title: "Compliance Mapping",
                items: [
                  "SOC 2 Trust Criteria",
                  "ISO 27001 Annex A",
                  "EU AI Act requirements",
                ],
              },
              {
                icon: <AlertTriangle className="h-6 w-6" />,
                title: "Red Flag Detection",
                items: [
                  "Critical risk indicators",
                  "Missing documentation flags",
                  "Mitigation recommendations",
                ],
              },
            ].map((section) => (
              <Card key={section.title}>
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                    {section.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{section.title}</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
