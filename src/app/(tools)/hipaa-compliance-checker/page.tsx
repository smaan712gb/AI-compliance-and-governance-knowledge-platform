import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  ShieldCheck,
  KeyRound,
  BellRing,
  FileSignature,
  GraduationCap,
  SearchCheck,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "HIPAA Compliance Checker - PHI Safeguards, Breach Notification & Risk Analysis",
  description:
    "Free HIPAA compliance assessment tool. Check PHI safeguard requirements, breach notification obligations, BAA management, employee training, and risk analysis across federal and state-specific health privacy laws.",
  path: "/hipaa-compliance-checker",
});

const domains = [
  {
    icon: ShieldCheck,
    title: "PHI Safeguards",
    description: "Administrative, physical, and technical safeguards under the HIPAA Security Rule (45 CFR Part 164)",
  },
  {
    icon: KeyRound,
    title: "Access Controls & Audit Logs",
    description: "User authentication, RBAC, audit trails, auto-logoff, and unique user identification requirements",
  },
  {
    icon: BellRing,
    title: "Breach Notification Rule",
    description: "60-day notification to individuals, OCR reporting for 500+ breaches, state AG notice, and media notification",
  },
  {
    icon: FileSignature,
    title: "Business Associate Agreements",
    description: "BAA required provisions (45 CFR 164.504(e)), subcontractor flow-down, and termination procedures",
  },
  {
    icon: GraduationCap,
    title: "Employee Training & Awareness",
    description: "Workforce training requirements, security awareness programs, sanctions for violations, and documentation",
  },
  {
    icon: SearchCheck,
    title: "Risk Analysis & Management",
    description: "Security Rule risk analysis (45 CFR 164.308(a)(1)), management plans, remediation tracking, and evaluation",
  },
];

const keyRegulations = [
  "HIPAA Privacy Rule (45 CFR Part 160, 164 Subpart E)",
  "HIPAA Security Rule (45 CFR Part 164 Subpart C)",
  "HITECH Act (2009) — Breach notification & enforcement",
  "Omnibus Rule (2013) — BA obligations & penalties",
  "California CMIA (Confidentiality of Medical Information)",
  "New York SHIELD Act (data security requirements)",
  "Texas HB 300 (health privacy beyond HIPAA)",
  "21st Century Cures Act (information blocking)",
];

export default function HIPAAComplianceCheckerPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          HIPAA Compliance Checker
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Assess your organization&apos;s HIPAA compliance obligations across PHI safeguards,
          breach notification, business associate agreements, risk analysis,
          and state-specific health privacy laws.
        </p>
        <Link href="/hipaa-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Compliance Domains */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Six Compliance Domains</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <Card key={domain.title}>
              <CardContent className="pt-6">
                <domain.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{domain.title}</h3>
                <p className="text-sm text-muted-foreground">{domain.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Regulations */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Key Regulations Covered</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {keyRegulations.map((reg) => (
            <div key={reg} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{reg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-muted/50 rounded-lg p-8">
        <h2 className="text-xl font-bold mb-2">Free to Use</h2>
        <p className="text-muted-foreground mb-4">
          Get an instant HIPAA compliance assessment with specific CFR citations,
          penalty tiers, safeguard requirements, and an actionable compliance checklist.
        </p>
        <Link href="/hipaa-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
