import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Banknote,
  UserSearch,
  Activity,
  ShieldAlert,
  FileCheck,
  Bitcoin,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "Financial Compliance Checker - AML, KYC, SOX, Sanctions & MiCA",
  description:
    "Free financial compliance assessment tool. Check AML/BSA program requirements, KYC/CDD obligations, transaction monitoring, sanctions screening, SOX internal controls, and crypto/MiCA compliance across 16 jurisdictions.",
  path: "/financial-compliance-checker",
});

const domains = [
  {
    icon: Banknote,
    title: "AML Program Assessment",
    description: "BSA compliance, risk-based AML program design, independent testing, and FinCEN requirements",
  },
  {
    icon: UserSearch,
    title: "KYC/CDD Compliance",
    description: "Customer due diligence, EDD for high-risk customers, beneficial ownership (CTA), and ongoing monitoring",
  },
  {
    icon: Activity,
    title: "Transaction Monitoring",
    description: "Suspicious activity detection, SAR/STR filing timelines, CTR thresholds, and pattern analysis",
  },
  {
    icon: ShieldAlert,
    title: "Sanctions Screening",
    description: "OFAC SDN list, EU restrictive measures, UN sanctions, PEP screening, and adverse media monitoring",
  },
  {
    icon: FileCheck,
    title: "SOX Internal Controls",
    description: "Sarbanes-Oxley Section 302/404, ICFR assessment, material weakness classification, and PCAOB standards",
  },
  {
    icon: Bitcoin,
    title: "Crypto/MiCA Compliance",
    description: "Markets in Crypto-Assets regulation, CASP authorization, travel rule (Regulation 2023/1113), and stablecoin reserves",
  },
];

const keyRegulations = [
  "Bank Secrecy Act / FinCEN (31 USC 5311-5332)",
  "EU 6th Anti-Money Laundering Directive (AMLD6)",
  "Sarbanes-Oxley Act Section 302/404",
  "Markets in Crypto-Assets Regulation (MiCA, EU 2023/1114)",
  "FATF 40 Recommendations",
  "OFAC Sanctions Programs (31 CFR Part 500)",
  "UK Money Laundering Regulations 2017",
  "Corporate Transparency Act (beneficial ownership)",
];

export default function FinancialComplianceCheckerPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Financial Compliance Checker
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Assess your organization&apos;s financial compliance obligations across AML/BSA programs,
          KYC/CDD requirements, transaction monitoring, sanctions screening, SOX controls,
          and crypto/MiCA regulations — covering 16 jurisdictions.
        </p>
        <Link href="/financial-compliance-checker/wizard">
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
          Get an instant financial compliance assessment with specific regulatory citations,
          deadlines, penalties, and an actionable compliance checklist.
        </p>
        <Link href="/financial-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
