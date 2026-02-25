import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Users,
  DollarSign,
  Globe,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "HR & Employment Compliance Checker - AI Hiring, Pay Transparency, Global Workforce",
  description:
    "Free HR compliance assessment tool. Check AI hiring bias audit requirements (NYC LL144, Colorado AI Act, EU AI Act), pay transparency obligations, remote work compliance, and employee data privacy across 20+ jurisdictions.",
  path: "/hr-compliance-checker",
});

const domains = [
  {
    icon: Users,
    title: "AI in Hiring & Recruitment",
    description: "NYC LL144 bias audits, Colorado AI Act impact assessments, EU AI Act Annex III high-risk classification",
  },
  {
    icon: DollarSign,
    title: "Pay Transparency & Equal Pay",
    description: "Salary posting requirements across CA, CO, NYC, WA, CT, and EU Pay Transparency Directive (2023/970)",
  },
  {
    icon: Globe,
    title: "Remote & Global Workforce",
    description: "EOR compliance, cross-border employment, contractor classification, and permanent establishment risk",
  },
  {
    icon: ShieldCheck,
    title: "Employee Data Privacy",
    description: "GDPR Article 88 for employment, BIPA biometric data, workplace monitoring, and employee consent",
  },
  {
    icon: AlertTriangle,
    title: "Whistleblower Protection",
    description: "EU Whistleblower Directive (2019/1937), SOX Section 806, and internal reporting channel requirements",
  },
  {
    icon: BarChart3,
    title: "DEI & ESG Workforce Reporting",
    description: "CSRD social metrics, EEO-1, gender pay gap reporting, and board diversity requirements",
  },
];

const keyRegulations = [
  "NYC Local Law 144 (AI hiring bias audits)",
  "Colorado AI Act (effective Feb 2026)",
  "EU AI Act Annex III (high-risk AI in employment)",
  "EU Pay Transparency Directive (transposition by June 2026)",
  "California SB 1162 (pay range disclosure)",
  "Illinois BIPA (biometric data in hiring)",
  "EU Whistleblower Directive (2019/1937)",
  "GDPR Article 88 (employment context)",
];

export default function HRComplianceCheckerPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          HR & Employment Compliance Checker
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Assess your organization&apos;s HR compliance obligations across AI hiring regulations,
          pay transparency laws, employee data privacy, and global workforce requirements — covering 20+ jurisdictions.
        </p>
        <Link href="/hr-compliance-checker/wizard">
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
          Get an instant HR compliance assessment with specific regulatory citations,
          deadlines, penalties, and an actionable compliance checklist.
        </p>
        <Link href="/hr-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
