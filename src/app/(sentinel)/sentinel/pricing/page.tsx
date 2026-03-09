"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { CheckCircle2, X, ArrowRight, Loader2, Radar } from "lucide-react";

interface PricingTier {
  name: string;
  slug: "pro" | "expert" | "strategic";
  price: string;
  period: string;
  description: string;
  features: string[];
  excluded: string[];
  cta: string;
  popular?: boolean;
}

const FREE_FEATURES = [
  "10 requests/minute",
  "100 requests/day",
  "5 reasoning analyses/day",
  "10 entity screenings/day",
  "7-day historical data",
  "Global Crisis Index (read-only)",
  "Community support",
];

const tiers: PricingTier[] = [
  {
    name: "Pro",
    slug: "pro",
    price: "$299",
    period: "/month",
    description: "For analysts and small teams needing daily intelligence",
    features: [
      "60 requests/minute",
      "5,000 requests/day",
      "100 reasoning analyses/day",
      "500 entity screenings/day",
      "90-day historical data",
      "Bias audit on all analyses",
      "REST API access with API keys",
      "Priority support",
    ],
    excluded: [
      "Supply chain risk engine",
      "Custom webhook alerts",
      "Dedicated account manager",
    ],
    cta: "Start with Pro",
  },
  {
    name: "Expert",
    slug: "expert",
    price: "$999",
    period: "/month",
    description: "For intelligence teams with supply chain oversight",
    features: [
      "120 requests/minute",
      "20,000 requests/day",
      "500 reasoning analyses/day",
      "2,000 entity screenings/day",
      "200 supply chain assessments/day",
      "1-year historical data",
      "Bias audit + supply chain module",
      "Full REST API access",
      "Custom webhook alerts",
      "Priority support",
    ],
    excluded: [
      "Unlimited requests",
      "Dedicated account manager",
    ],
    cta: "Start with Expert",
    popular: true,
  },
  {
    name: "Strategic",
    slug: "strategic",
    price: "$4,999",
    period: "/month",
    description: "For enterprises with global risk management needs",
    features: [
      "600 requests/minute",
      "100,000 requests/day",
      "5,000 reasoning analyses/day",
      "10,000 entity screenings/day",
      "1,000 supply chain assessments/day",
      "2-year historical data",
      "All modules unlocked",
      "Unlimited API keys",
      "Custom webhook alerts",
      "Dedicated account manager",
      "SLA guarantee (99.9% uptime)",
      "Custom integration support",
    ],
    excluded: [],
    cta: "Start Strategic Trial",
  },
];

export default function SentinelPricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubscribe(plan: PricingTier["slug"]) {
    setLoadingPlan(plan);
    setError("");
    try {
      const res = await fetch("/api/sentinel/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push(`/register?callbackUrl=/sentinel/pricing`);
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        router.push(`/sentinel/dashboard/settings`);
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
              Sentinel Pricing
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered geopolitical intelligence for every scale.
              Start free, upgrade when you need more.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Radar className="h-4 w-4 text-emerald-600" />
              <span>14-day money-back guarantee on all paid plans</span>
            </div>
          </div>

          {error && (
            <div className="max-w-xl mx-auto mb-8 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {/* Free tier callout */}
          <div className="max-w-6xl mx-auto mb-10">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Free Tier</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Get started with basic intelligence — no credit card required
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
                    {FREE_FEATURES.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/sentinel/dashboard">
                    <Button variant="outline">
                      Start Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Paid tiers */}
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border bg-card p-8 space-y-6 ${
                  tier.popular ? "border-emerald-500 shadow-lg ring-1 ring-emerald-500" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-medium text-white">
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
                  className={`w-full ${tier.popular ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
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
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
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
            Need custom pricing or volume discounts?{" "}
            <a
              href="mailto:smaan@aimadds.com?subject=Sentinel Enterprise Inquiry"
              className="text-emerald-600 hover:underline"
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
                  q: "What intelligence sources does Sentinel use?",
                  a: "Sentinel aggregates 435+ RSS feeds, OpenSanctions (27+ sanctions lists), OFAC SDN list, and GDELT 2.0 events database. AI analysis is performed by DeepSeek R1 for reasoning and Llama-3.3-70B for bias detection.",
                },
                {
                  q: "Is Sentinel separate from AIGovHub subscriptions?",
                  a: "Yes. Sentinel has its own subscription tiers, independent of AIGovHub compliance tools and the CCM platform. You can use any combination independently.",
                },
                {
                  q: "How does the financial crime screening work?",
                  a: "Entities are screened against 27+ sanctions lists via OpenSanctions API with fuzzy name matching. The composite score combines sanctions (50%), PEP status (20%), adverse media (25%), and geographic risk (5%).",
                },
                {
                  q: "What is the Crisis Index?",
                  a: "The Global Crisis Index scores countries on a 0-100 scale using 4 components (deadliness, civilian danger, diffusion, fragmentation) plus structural baseline and real-time event data. Updated daily.",
                },
                {
                  q: "Can I embed Sentinel data into my own systems?",
                  a: "Yes — Pro tier and above includes REST API access with API keys. All endpoints return structured JSON. Rate limits vary by tier. Strategic tier includes custom integration support.",
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
