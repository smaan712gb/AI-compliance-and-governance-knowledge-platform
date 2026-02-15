import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "EU AI Act Compliance Checker - Free Assessment Tool",
  description:
    "Free AI Act compliance checker. Identify your AI system's risk classification, obligations, timeline, and recommended controls under the EU AI Act (Regulation 2024/1689).",
  path: "/ai-act-checker",
});

export default function AIActCheckerPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="warning" className="mb-4">
            EU AI Act fully applicable August 2, 2026
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            EU AI Act Compliance Checker
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Find out exactly what the EU AI Act requires for your AI system.
            Get a personalized obligations checklist, compliance timeline, and
            recommended controls in minutes.
          </p>
          <div className="mt-8">
            <Link href="/ai-act-checker/wizard">
              <Button size="lg" className="gap-2">
                <Shield className="h-5 w-5" />
                Start Free Assessment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            No signup required. Takes 2-3 minutes.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-4 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                icon: <Shield className="h-6 w-6" />,
                title: "Select Your Role",
                description:
                  "Are you a provider, deployer, importer, or distributor of the AI system?",
              },
              {
                step: "2",
                icon: <AlertTriangle className="h-6 w-6" />,
                title: "Describe Your System",
                description:
                  "Select the AI system type, geography, and describe your specific use case.",
              },
              {
                step: "3",
                icon: <FileText className="h-6 w-6" />,
                title: "Get Your Assessment",
                description:
                  "Receive a detailed risk classification, obligations checklist, and timeline.",
              },
              {
                step: "4",
                icon: <CheckCircle className="h-6 w-6" />,
                title: "Take Action",
                description:
                  "Follow recommended controls and download your PDF report for your team.",
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

      {/* What You Get */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            What You Get
          </h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <CheckCircle className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold mb-2">Obligations Checklist</h3>
                <p className="text-sm text-muted-foreground">
                  A prioritized list of every obligation that applies to your
                  specific AI system, with article references and action items.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">Compliance Timeline</h3>
                <p className="text-sm text-muted-foreground">
                  Key deadlines from the EU AI Act phased implementation, with
                  status indicators showing what&apos;s urgent vs upcoming.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="font-semibold mb-2">Recommended Controls</h3>
                <p className="text-sm text-muted-foreground">
                  Specific technical, organizational, and documentation controls
                  mapped to SOC 2, ISO 27001, and NIST AI RMF.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold">
            Ready to Check Your Compliance?
          </h2>
          <p className="mt-3 opacity-90 max-w-lg mx-auto">
            Join thousands of organizations preparing for the EU AI Act.
            Get your personalized assessment in minutes.
          </p>
          <div className="mt-6">
            <Link href="/ai-act-checker/wizard">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Free Assessment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
