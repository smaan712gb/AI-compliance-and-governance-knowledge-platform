import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import {
  Shield,
  Plug,
  Brain,
  AlertTriangle,
  FileArchive,
  BarChart3,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  X,
  Zap,
  Globe,
  Users,
  Key,
} from "lucide-react";

const features = [
  {
    icon: Plug,
    title: "Enterprise ERP Connectors",
    description:
      "Connect SAP S/4HANA, ECC, Oracle, Workday, Dynamics 365 and more. Pull compliance-relevant data automatically — no agents, no custom code.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis & Remediation",
    description:
      "BYOK — use your own LLM (OpenAI, Claude, DeepSeek, Azure, Google Vertex) for compliance analysis, root-cause diagnosis, and step-by-step remediation plans.",
  },
  {
    icon: AlertTriangle,
    title: "Continuous Controls Monitoring",
    description:
      "Automated rules detect SOX, PCI DSS, HIPAA, AML, GDPR, ISO 27001 violations in real time as data flows from your ERP systems.",
  },
  {
    icon: FileArchive,
    title: "Audit Evidence Library",
    description:
      "Collect, organize, and export audit evidence with one click. Auto-collected evidence from monitoring runs cuts audit prep time by 80%.",
  },
  {
    icon: BarChart3,
    title: "Executive Compliance Reports",
    description:
      "Generate board-ready compliance reports for SOX, PCI, AML, and custom frameworks with AI narrative. Export in seconds, not days.",
  },
  {
    icon: Lock,
    title: "Enterprise Security by Design",
    description:
      "AES-256-GCM encryption at rest, TLS in transit, RBAC with 5 roles, immutable audit trail — designed for SOC 2 and ISO 27001 audits.",
  },
];

const frameworks = [
  "SOX (Sarbanes-Oxley)",
  "PCI DSS v4.0",
  "HIPAA / HITECH",
  "AML / BSA / FinCEN",
  "GDPR / DPDP",
  "ISO 27001:2022",
  "NIST CSF 2.0",
  "CUSTOM frameworks",
];

const connectorTypes = [
  { name: "SAP S/4HANA Cloud", status: "Available" },
  { name: "SAP S/4HANA On-Premise", status: "Available" },
  { name: "SAP ECC 6.0", status: "Available" },
  { name: "Mock / Demo Connector", status: "Available" },
  { name: "Oracle ERP Cloud", status: "Q3 2026" },
  { name: "Workday Financial", status: "Q3 2026" },
  { name: "SAP Concur", status: "Q4 2026" },
  { name: "Microsoft Dynamics 365", status: "Q1 2027" },
  { name: "Oracle NetSuite", status: "Q2 2027" },
];

const comparison = [
  { feature: "Multi-ERP connectors (SAP, Oracle, Workday)", us: true, sap: false },
  { feature: "AI-generated remediation plans", us: true, sap: false },
  { feature: "BYOK — any LLM provider", us: true, sap: false },
  { feature: "Natural language rule authoring", us: true, sap: false },
  { feature: "Continuous monitoring (not batch)", us: true, sap: true },
  { feature: "SOX, PCI, AML, HIPAA, GDPR frameworks", us: true, sap: true },
  { feature: "Audit evidence library", us: true, sap: true },
  { feature: "RBAC & team management", us: true, sap: true },
  { feature: "Modern SaaS — no on-site install", us: true, sap: false },
  { feature: "Transparent per-seat pricing", us: true, sap: false },
  { feature: "6-week implementation (vs 6 months)", us: true, sap: false },
];

export default function CCMLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm mb-6">
            <Shield className="h-4 w-4 text-primary" />
            <span>Continuous Controls Monitoring — CCM Platform</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            AI-Native Compliance Monitoring for{" "}
            <span className="text-primary">Any Enterprise ERP</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect SAP, Oracle, Workday, and more. Continuously monitor SOX, PCI, AML, and GDPR controls.
            Detect violations with AI. Generate remediation plans in seconds — not days.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ccm/dashboard">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/ccm/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required to start. SOC 2 &amp; ISO 27001 ready.
          </p>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            {[
              { icon: Shield, label: "SOC 2 Type II Ready" },
              { icon: Lock, label: "ISO 27001 Aligned" },
              { icon: Globe, label: "GDPR Compliant" },
              { icon: Key, label: "AES-256-GCM Encryption" },
              { icon: Users, label: "RBAC — 5 Roles" },
              { icon: Zap, label: "99.9% SLA (Enterprise)" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything for Continuous Compliance</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Replace manual audit preparation and expensive consulting with automated, AI-powered controls monitoring.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border bg-card p-6 space-y-3">
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* vs SAP Process Control comparison */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">CCM Platform vs SAP Process Control</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              All the power of SAP Process Control — plus multi-ERP support, AI remediation, and a modern SaaS experience.
            </p>
          </div>
          <div className="max-w-3xl mx-auto rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 text-sm font-semibold p-4 border-b">
              <span>Capability</span>
              <span className="text-center text-primary">AIGovHub CCM</span>
              <span className="text-center text-muted-foreground">SAP Process Control</span>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 p-4 text-sm items-center ${i !== comparison.length - 1 ? "border-b" : ""}`}
              >
                <span>{row.feature}</span>
                <span className="text-center">
                  {row.us ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-destructive mx-auto" />
                  )}
                </span>
                <span className="text-center">
                  {row.sap ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground mx-auto" />
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            SAP Process Control is a registered trademark of SAP SE. Comparison based on publicly documented capabilities.
          </p>
        </div>
      </section>

      {/* Frameworks + ERP Roadmap */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">
                8 Compliance Frameworks, Out of the Box
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Pre-built monitoring rules for every major regulatory framework.
                Build custom rules with natural language — no code required.
              </p>
              <ul className="mt-6 space-y-3">
                {frameworks.map((fw) => (
                  <li key={fw} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-lg">{fw}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                ERP Connector Roadmap
              </h3>
              <div className="space-y-2">
                {connectorTypes.map((ct) => (
                  <div key={ct.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{ct.name}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ct.status === "Available"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ct.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BYOK */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Brain className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold">Bring Your Own Key (BYOK)</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Your compliance data never leaves your control. Connect your own AI provider — API keys are encrypted
            with AES-256-GCM and never logged. Switch providers without losing history.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["OpenAI GPT-4o", "Claude Sonnet 4", "DeepSeek R1", "Azure OpenAI", "Google Vertex AI", "Self-hosted LLMs"].map((model) => (
              <div key={model} className="rounded-full border bg-background px-4 py-2 text-sm font-medium">
                {model}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-Grade Security</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Designed from the ground up for financial services, healthcare, and regulated industries.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            {[
              { title: "AES-256-GCM", desc: "All credentials encrypted at rest, per-org keys" },
              { title: "TLS 1.3", desc: "All connections encrypted in transit" },
              { title: "5-Role RBAC", desc: "Owner → Admin → Analyst → Auditor → Viewer" },
              { title: "Immutable Audit Trail", desc: "Every action logged with timestamp, IP, user" },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border p-5">
                <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Stop Manual Compliance Monitoring
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            Enterprise teams using CCM detect compliance violations 6× faster and cut audit prep time by 80%.
            Set up your first ERP connector in under 15 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ccm/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/ccm/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                View Plans &amp; Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm opacity-75">No credit card required. Enterprise plans start at $499/month.</p>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AIGovHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
