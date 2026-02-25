import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  Network,
  Lock,
  Bug,
  KeyRound,
  MonitorCheck,
  FileText,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "PCI DSS Compliance Checker - Payment Card Security, SAQ & v4.0.1 Requirements",
  description:
    "Free PCI DSS compliance assessment tool. Check network security, data protection, access control, vulnerability management, and monitoring requirements. SAQ determination, card brand programs, and PCI DSS v4.0.1 transition guidance.",
  path: "/pci-compliance-checker",
});

const domains = [
  {
    icon: Network,
    title: "Network Security (Req 1-2)",
    description: "Firewall configuration, network segmentation, secure system configurations, and CDE boundary protection",
  },
  {
    icon: Lock,
    title: "Data Protection (Req 3-4)",
    description: "Cardholder data storage, encryption at rest and in transit, tokenization, masking, and key management",
  },
  {
    icon: Bug,
    title: "Vulnerability Management (Req 5-6)",
    description: "Anti-malware, secure SDLC, patch management, payment page script monitoring (Req 6.4.3)",
  },
  {
    icon: KeyRound,
    title: "Access Control (Req 7-9)",
    description: "Need-to-know access, MFA for CDE access (Req 8.4.2), physical access controls, and unique user IDs",
  },
  {
    icon: MonitorCheck,
    title: "Monitoring & Testing (Req 10-11)",
    description: "Logging, SIEM, IDS/IPS, ASV scanning, penetration testing, and file integrity monitoring",
  },
  {
    icon: FileText,
    title: "Security Policies (Req 12)",
    description: "Information security policy, targeted risk analysis (Req 12.3.1), training, and incident response",
  },
];

const keyRegulations = [
  "PCI DSS v4.0.1 (all requirements mandatory)",
  "Visa Cardholder Information Security Program (CISP)",
  "Mastercard Site Data Protection (SDP)",
  "PCI PA-DSS (Payment Application)",
  "PCI P2PE (Point-to-Point Encryption)",
  "EU PSD2 Strong Customer Authentication (SCA)",
  "PCI PIN Security Requirements",
  "PCI 3-D Secure (3DS) Core Security Standard",
];

export default function PCIComplianceCheckerPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          PCI DSS Compliance Checker
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Assess your organization&apos;s PCI DSS compliance obligations across network security,
          data protection, access controls, vulnerability management, and monitoring requirements
          — with SAQ determination and PCI DSS v4.0.1 transition guidance.
        </p>
        <Link href="/pci-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Compliance Domains */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Six Requirement Domains</h2>
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
        <h2 className="text-2xl font-bold text-center mb-8">Standards & Programs Covered</h2>
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
          Get an instant PCI DSS compliance assessment with specific requirement numbers,
          v4.0.1 changes, card brand penalties, and an actionable compliance checklist.
        </p>
        <Link href="/pci-compliance-checker/wizard">
          <Button size="lg" className="gap-2">
            Start Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
