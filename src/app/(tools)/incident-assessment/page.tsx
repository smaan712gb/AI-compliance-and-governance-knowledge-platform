import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, AlertTriangle, FileText, Clock, Shield } from "lucide-react";

export const metadata = buildMetadata({
  title: "Cyber Incident Materiality Assessment - SEC 8-K Compliance",
  description:
    "Assess cybersecurity incident materiality under SEC rules, GDPR Art 33-34, HIPAA, and state breach laws. Get 8-K draft, board briefing, and disclosure timeline.",
  path: "/incident-assessment",
});

export default function IncidentAssessmentPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            SEC 8-K + GDPR Art 33 + HIPAA
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Cyber Incident Materiality Assessment
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Determine if your cybersecurity incident is material under SEC rules.
            Get disclosure drafts, regulatory timelines, and board briefing memos — in minutes.
          </p>
          <Link href="/incident-assessment/wizard">
            <Button size="lg" className="gap-2">
              Start Assessment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-5 gap-4 mb-16">
          {[
            { step: "1", title: "Incident Type" },
            { step: "2", title: "Impact Details" },
            { step: "3", title: "Timeline" },
            { step: "4", title: "Org Context" },
            { step: "5", title: "Assessment" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-2">
                {item.step}
              </div>
              <p className="text-sm font-medium">{item.title}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">What You Get</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <AlertTriangle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Materiality Determination</h3>
              <p className="text-sm text-muted-foreground">
                Clear materiality level with quantitative and qualitative analysis
                following SEC and GDPR criteria.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">SEC 8-K Draft</h3>
              <p className="text-sm text-muted-foreground">
                Ready-to-file Form 8-K Item 1.05 disclosure text for public companies,
                following July 2023 cybersecurity disclosure rules.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Regulatory Timelines</h3>
              <p className="text-sm text-muted-foreground">
                Deadline calculations for SEC (4 business days), GDPR (72 hours),
                HIPAA (60 days), and state breach notification laws.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Board Briefing Memo</h3>
              <p className="text-sm text-muted-foreground">
                Executive-level briefing document for board and audit committee
                notification, with readiness checklist.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-primary rounded-lg p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-3">
            Every Hour Counts After an Incident
          </h2>
          <p className="mb-6 opacity-90">
            SEC requires 8-K filing within 4 business days. GDPR requires DPA notification within 72 hours.
          </p>
          <Link href="/incident-assessment/wizard">
            <Button variant="secondary" size="lg" className="gap-2">
              Start Assessment Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
