import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  FileCheck,
  Database,
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { InlineCaptureForm } from "@/components/email-capture/inline-capture-form";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            EU AI Act fully applicable August 2, 2026
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            AI Governance &<br />
            <span className="text-primary">Compliance Automation</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            The AI Compliance & Trust Stack Knowledge Engine. Check your EU AI
            Act obligations, generate vendor risk questionnaires, and compare
            the best governance tools — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ai-act-checker">
              <Button size="lg" className="gap-2">
                <Shield className="h-5 w-5" />
                Check AI Act Compliance
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/vendors">
              <Button variant="outline" size="lg" className="gap-2">
                <Database className="h-5 w-5" />
                Browse Vendor Tracker
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free tools. No credit card required.
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y bg-muted/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              SOC 2 Mapping
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              ISO 27001
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              EU AI Act
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              HIPAA
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              NIST AI RMF
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              PCI DSS
            </span>
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Free Compliance Tools</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Purpose-built tools to accelerate your AI governance journey.
              No signup required to get started.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      AI Act Compliance Checker
                    </CardTitle>
                    <CardDescription>
                      Know your obligations in minutes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Identify your AI system&apos;s risk classification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Get a personalized obligations checklist
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    View compliance timeline with key deadlines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Download PDF report for your team
                  </li>
                </ul>
                <Link href="/ai-act-checker">
                  <Button className="w-full gap-2">
                    Start Compliance Check
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Vendor Risk Questionnaire
                    </CardTitle>
                    <CardDescription>
                      AI vendor due diligence made easy
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Generate tailored vendor questionnaires
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Identify red flags automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Map to SOC 2, ISO 27001 requirements
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Export as PDF or DOCX
                  </li>
                </ul>
                <Link href="/vendor-risk-questionnaire">
                  <Button variant="outline" className="w-full gap-2">
                    Generate Questionnaire
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Vendor Tracker Preview */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">AI Governance Vendor Tracker</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              A living database of AI governance, compliance, and risk
              management tools. Compare features, pricing, and frameworks.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              "AI Governance Platforms",
              "GRC Platforms",
              "Bias & Fairness Testing",
              "Model Risk Management",
              "Data Governance",
              "Privacy & Compliance",
            ].map((category) => (
              <Card key={category} className="text-center p-6">
                <Database className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-medium">{category}</h3>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/vendors">
              <Button variant="outline" size="lg" className="gap-2">
                Explore All Vendors
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Products Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Compliance Toolkits</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Ready-to-use templates, checklists, and policy packs to
              accelerate your compliance journey.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>AI Act Readiness Toolkit</CardTitle>
                <CardDescription>
                  Everything you need for EU AI Act compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">$49</span>
                  <span className="text-muted-foreground">starting from</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Risk classification templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    FRIA & DPIA templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    AI policy framework
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Compliance checklist
                  </li>
                </ul>
                <Link href="/products/ai-act-starter-toolkit">
                  <Button className="w-full">View Toolkit</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Questionnaire Pack</CardTitle>
                <CardDescription>
                  SOC 2, ISO 27001, HIPAA mappings + autofill answers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">$99</span>
                  <span className="text-muted-foreground">starting from</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    500+ pre-written answers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    SOC 2 control mappings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ISO 27001 Annex A mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    Customizable templates
                  </li>
                </ul>
                <Link href="/products/questionnaire-basic-pack">
                  <Button variant="outline" className="w-full">
                    View Pack
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Link href="/products">
              <Button variant="link" className="gap-2">
                View all products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Urgency / Timeline CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold">
            The EU AI Act Deadline Is Approaching
          </h2>
          <p className="mt-4 max-w-2xl mx-auto opacity-90">
            Full application begins August 2, 2026. High-risk AI systems must
            comply with all requirements. Start your readiness assessment today.
          </p>
          <div className="mt-8">
            <Link href="/ai-act-checker">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <Zap className="h-5 w-5" />
                Free Compliance Check
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <InlineCaptureForm
            source="homepage"
            title="Stay Ahead of AI Regulations"
            description="Get weekly updates on AI governance, new compliance requirements, and vendor reviews. Plus a free AI Due Diligence Checklist."
            buttonText="Get Free Checklist"
            placeholder="Enter your work email"
          />
        </div>
      </section>
    </>
  );
}
