"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Radar,
  Brain,
  ShieldAlert,
  BarChart3,
  Truck,
  Globe,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Reasoning",
    description:
      "DeepSeek R1 chain-of-thought analysis transforms raw intelligence into actionable insights with transparent reasoning chains.",
  },
  {
    icon: ShieldAlert,
    title: "Financial Crime Screening",
    description:
      "Screen entities against OpenSanctions, OFAC, EU, and UN sanctions lists with fuzzy matching and composite risk scoring.",
  },
  {
    icon: BarChart3,
    title: "Global Crisis Index",
    description:
      "Real-time country instability scoring across 6 composite indicators — deadliness, civilian danger, diffusion, and fragmentation.",
  },
  {
    icon: Truck,
    title: "Supply Chain Risk Engine",
    description:
      "Supplier-level geopolitical risk assessment with cascade analysis, concentration detection, and mitigation recommendations.",
  },
  {
    icon: Globe,
    title: "Bias Guardrails",
    description:
      "Llama-3 powered bias detection for sensitive geopolitical regions. Automated framing, omission, and attribution analysis.",
  },
  {
    icon: Zap,
    title: "Tiered API Access",
    description:
      "RESTful API with rate limiting, usage tracking, and tiered access control. Embed intelligence into your existing systems.",
  },
];

const CAPABILITIES = [
  "435+ intelligence sources aggregated in real-time",
  "DeepSeek R1 reasoning with visible chain-of-thought",
  "27+ sanctions lists (OFAC, EU, UN, UK, and more)",
  "Crisis scoring for 200+ countries",
  "Supply chain cascade risk analysis",
  "Bias detection for 14 sensitive regions",
  "REST API with 4 subscription tiers",
  "Webhook alerts for critical events",
];

export default function SentinelLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-background py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6">
              <Radar className="h-4 w-4" />
              AI-Native Geopolitical Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Turn Global Chaos into{" "}
              <span className="text-emerald-400">Actionable Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              SENTINEL transforms raw geopolitical data into structured intelligence
              with AI-powered reasoning, financial crime screening, crisis indices,
              and supply chain risk analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sentinel/dashboard">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sentinel/pricing">
                <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Enterprise Intelligence Platform
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Six integrated modules powered by state-of-the-art AI models for
            comprehensive geopolitical risk intelligence.
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Built for Intelligence Professionals
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {CAPABILITIES.map((cap) => (
                <div key={cap} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{cap}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/sentinel/pricing">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AIGovHub. All rights reserved.</p>
          <p className="mt-1">
            <Link href="/terms" className="hover:underline">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:underline">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
