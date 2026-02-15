"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
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
    price: 19,
    description: "For individuals exploring AI compliance",
    features: [
      "10 compliance checks/month",
      "5 questionnaire generations/month",
      "Basic vendor tracker access",
      "Email support",
    ],
    priceId: "starter",
  },
  {
    name: "Professional",
    price: 49,
    description: "For teams managing AI compliance programs",
    features: [
      "Unlimited compliance checks",
      "Unlimited questionnaire generations",
      "Full vendor tracker with filters",
      "Updated toolkit downloads",
      "Priority email support",
      "Export to PDF/DOCX",
    ],
    priceId: "professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 99,
    description: "For organizations with complex compliance needs",
    features: [
      "Everything in Professional",
      "Custom questionnaire templates",
      "Multi-user access (up to 10)",
      "API access",
      "Dedicated support",
      "Custom framework mappings",
    ],
    priceId: "enterprise",
  },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(priceId: string) {
    setLoading(priceId);
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
      }
    } catch {
      // Error handling
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling
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
                <span className="text-3xl font-bold">${tier.price}</span>
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
