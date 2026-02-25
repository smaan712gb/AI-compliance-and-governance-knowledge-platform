"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { CheckCircle2, X, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

interface PricingTier {
  name: string;
  slug: "starter" | "professional" | "enterprise";
  price: string;
  period: string;
  description: string;
  features: string[];
  excluded: string[];
  cta: string;
  popular?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    slug: "starter",
    price: "$499",
    period: "/month",
    description: "For small teams starting with compliance monitoring",
    features: [
      "1 ERP connector (SAP or Mock/Demo)",
      "5 team members",
      "25 monitoring rules",
      "100 AI analyses/month",
      "SOX framework",
      "12-hour sync frequency",
      "1 GB evidence storage",
      "90-day audit log retention",
      "DeepSeek BYOK",
      "Email support",
    ],
    excluded: [
      "Multi-framework (PCI, AML, HIPAA, GDPR)",
      "Real-time sync",
      "Multiple connectors",
      "Custom LLM providers (OpenAI, Claude, Azure)",
    ],
    cta: "Start with Starter",
  },
  {
    name: "Professional",
    slug: "professional",
    price: "$1,499",
    period: "/month",
    description: "For growing compliance teams with multi-framework needs",
    features: [
      "3 ERP connectors",
      "15 team members",
      "100 monitoring rules",
      "500 AI analyses/month",
      "SOX + PCI DSS + AML/BSA",
      "4-hour sync frequency",
      "10 GB evidence storage",
      "1-year audit log retention",
      "All BYOK providers (OpenAI, Claude, Azure, DeepSeek)",
      "Custom monitoring rules",
      "Priority support",
    ],
    excluded: [
      "Unlimited connectors",
      "Real-time sync",
      "HIPAA, GDPR, ISO 27001, NIST CSF",
    ],
    cta: "Start with Professional",
    popular: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: "$4,999",
    period: "/month",
    description: "For large organizations with complex compliance requirements",
    features: [
      "Unlimited ERP connectors",
      "Unlimited team members",
      "Unlimited monitoring rules",
      "Unlimited AI analyses",
      "All 8 compliance frameworks",
      "1-hour + real-time event sync",
      "100 GB evidence storage",
      "7-year audit log retention",
      "All BYOK + self-hosted LLMs",
      "Custom monitoring rules",
      "Automated remediation workflows",
      "Dedicated Customer Success Manager",
      "SLA guarantee (99.9% uptime)",
      "Custom integrations on request",
    ],
    excluded: [],
    cta: "Start Enterprise Trial",
  },
];

export default function CCMPricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubscribe(plan: PricingTier["slug"]) {
    setLoadingPlan(plan);
    setError("");
    try {
      const res = await fetch("/api/ccm/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push(`/register?callbackUrl=/ccm/pricing`);
        return;
      }

      if (res.status === 404) {
        // No org yet — create one first in settings
        router.push(`/ccm/dashboard/settings`);
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        router.push(`/ccm/dashboard/settings`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to start checkout. Please try again.");
        return;
      }

      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              CCM Platform Pricing
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              Continuous compliance monitoring for enterprise ERP systems.
              All plans include a Demo connector — no live ERP required to get started.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>30-day money-back guarantee on all plans</span>
            </div>
          </div>

          {error && (
            <div className="max-w-xl mx-auto mb-8 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border bg-card p-8 space-y-6 ${
                  tier.popular ? "border-primary shadow-lg ring-1 ring-primary" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold">{tier.name}</h2>
                  <p className="text-muted-foreground mt-1">{tier.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  size="lg"
                  disabled={loadingPlan !== null}
                  onClick={() => handleSubscribe(tier.slug)}
                >
                  {loadingPlan === tier.slug ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      {tier.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {tier.excluded.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 opacity-40">
                      <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Need custom pricing, volume discounts, or procurement support?{" "}
            <a
              href="mailto:smaan@aimadds.com?subject=CCM Enterprise Inquiry"
              className="text-primary hover:underline"
            >
              Contact our sales team
            </a>
          </p>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: "Do I need an ERP system to get started?",
                  a: "No. Every plan includes a Demo connector with realistic mock compliance data. You can explore all features, set up rules, and review findings — then connect your real ERP when ready.",
                },
                {
                  q: "Is the CCM subscription separate from AIGovHub tools?",
                  a: "Yes. The CCM platform has its own subscription tiers, independent of the AIGovHub compliance checker tools. You can use both independently.",
                },
                {
                  q: "What is BYOK (Bring Your Own Key)?",
                  a: "BYOK lets you configure your own AI provider API keys (OpenAI, Anthropic Claude, DeepSeek, Azure OpenAI, Google Vertex AI) for all AI features. Your compliance data goes directly to your chosen provider. API keys are encrypted with AES-256-GCM and never logged.",
                },
                {
                  q: "How does the SAP integration work?",
                  a: "You provide your SAP connection details (hostname, client, credentials or OAuth2 token). The platform connects via standard SAP OData V4 APIs to pull journal entries, user access logs, change documents, and payment transactions. No SAP add-ons required.",
                },
                {
                  q: "Is my data secure and isolated?",
                  a: "Yes. All ERP credentials are encrypted at rest with AES-256-GCM using a per-organization key. Data is fully isolated — no cross-tenant access is possible. Every action is logged to an immutable audit trail.",
                },
                {
                  q: "Can I upgrade or downgrade my plan?",
                  a: "Yes. Upgrade, downgrade, or cancel anytime via the Stripe Billing Portal in your Settings page. Upgrades take effect immediately; downgrades apply at the end of the billing period.",
                },
              ].map((faq) => (
                <div key={faq.q} className="rounded-lg border p-6">
                  <h3 className="font-semibold text-lg">{faq.q}</h3>
                  <p className="mt-2 text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
