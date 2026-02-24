"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Loader2 } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: 99,
    description: "For small compliance teams getting started",
    features: [
      "3 jurisdiction trackers",
      "Personalized regulatory alerts",
      "5 vendor assessments/month",
      "Unlimited compliance checks",
      "Priority email support",
    ],
    priceId: "starter",
  },
  {
    name: "Professional",
    price: 499,
    description: "For mid-size organizations with multi-jurisdiction needs",
    features: [
      "10 jurisdiction trackers",
      "ERP compliance gap analysis",
      "25 vendor assessments/month",
      "Document generation",
      "PDF & DOCX export",
      "Everything in Starter",
    ],
    priceId: "professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 2000,
    description: "For large enterprises with complex compliance programs",
    features: [
      "Unlimited jurisdictions",
      "Unlimited vendor assessments",
      "API access (1,000 req/day)",
      "SSO & SAML",
      "Custom reports & integrations",
      "Dedicated support",
    ],
    priceId: "enterprise",
  },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current subscription status
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        if (res.ok) {
          setCurrentTier("active");
        }
      } catch {
        // No active subscription
      }
    }
    if (session?.user) fetchSubscription();
  }, [session]);

  async function handleSubscribe(priceId: string) {
    setLoading(priceId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          mode: "subscription",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "No active subscription found. Subscribe to a plan first.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Subscription</h1>
      <p className="text-muted-foreground mb-8">
        Manage your subscription plan and billing.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={tier.popular ? "border-primary relative" : ""}
          >
            {tier.popular && (
              <Badge className="absolute -top-2.5 left-4">Most Popular</Badge>
            )}
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold">${tier.price.toLocaleString()}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(tier.priceId)}
                disabled={loading !== null}
              >
                {loading === tier.priceId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Manage Existing */}
      <Card className="mt-8">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold">Manage Billing</h3>
            <p className="text-sm text-muted-foreground">
              Update payment method, view invoices, or cancel your subscription.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleManage}
            disabled={loading !== null}
          >
            {loading === "manage" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Manage Billing"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
