import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { CheckCircle, Minus } from "lucide-react";

export const metadata = buildMetadata({
  title: "Pricing - AI Governance Tools & Subscriptions",
  description:
    "Pricing for AIGovHub subscriptions and digital products. Free tools, starter plans from $19/mo, and one-time toolkits from $49.",
  path: "/pricing",
});

const subscriptionTiers = [
  {
    name: "Free",
    price: 0,
    description: "Get started with basic compliance tools",
    features: [
      { text: "3 compliance checks/month", included: true },
      { text: "2 questionnaire generations/month", included: true },
      { text: "Limited vendor tracker access", included: true },
      { text: "Community resources", included: true },
      { text: "PDF export", included: false },
      { text: "Priority support", included: false },
      { text: "API access", included: false },
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
    variant: "outline" as const,
  },
  {
    name: "Professional",
    price: 49,
    description: "For teams managing AI compliance programs",
    badge: "Most Popular",
    features: [
      { text: "Unlimited compliance checks", included: true },
      { text: "Unlimited questionnaire generations", included: true },
      { text: "Full vendor tracker with all filters", included: true },
      { text: "Updated toolkit downloads", included: true },
      { text: "PDF & DOCX export", included: true },
      { text: "Priority email support", included: true },
      { text: "API access", included: false },
    ],
    cta: "Start Professional",
    ctaHref: "/dashboard/subscription",
    variant: "default" as const,
  },
  {
    name: "Enterprise",
    price: 99,
    description: "For organizations with complex compliance needs",
    features: [
      { text: "Everything in Professional", included: true },
      { text: "Custom questionnaire templates", included: true },
      { text: "Multi-user access (up to 10)", included: true },
      { text: "API access (1000 req/day)", included: true },
      { text: "Custom framework mappings", included: true },
      { text: "Dedicated support", included: true },
      { text: "SSO & SAML (coming soon)", included: true },
    ],
    cta: "Start Enterprise",
    ctaHref: "/dashboard/subscription",
    variant: "outline" as const,
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Simple, Transparent Pricing</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Start free and upgrade as your compliance needs grow. All plans
          include access to our core tools.
        </p>
      </div>

      {/* Subscription Tiers */}
      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-20">
        {subscriptionTiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col ${
              tier.badge ? "border-primary" : ""
            }`}
          >
            {tier.badge && (
              <Badge className="absolute -top-2.5 left-4">{tier.badge}</Badge>
            )}
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold">
                  {tier.price === 0 ? "Free" : `$${tier.price}`}
                </span>
                {tier.price > 0 && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature.text}
                    className="flex items-start gap-2 text-sm"
                  >
                    {feature.included ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span
                      className={
                        feature.included ? "" : "text-muted-foreground"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href={tier.ctaHref} className="w-full">
                <Button
                  className="w-full"
                  variant={tier.variant}
                >
                  {tier.cta}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* One-Time Products */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold">One-Time Toolkits</h2>
        <p className="mt-2 text-muted-foreground">
          Download-and-use compliance toolkits. No subscription required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
        {[
          {
            name: "AI Act Starter",
            price: "$49",
            description: "Essential checklists & templates",
            href: "/products/ai-act-starter-toolkit",
          },
          {
            name: "AI Act Professional",
            price: "$199",
            description: "Comprehensive compliance package",
            href: "/products/ai-act-pro-toolkit",
          },
          {
            name: "Questionnaire Basic",
            price: "$99",
            description: "SOC 2 & ISO 27001 mappings",
            href: "/products/questionnaire-basic-pack",
          },
          {
            name: "Questionnaire Enterprise",
            price: "$499",
            description: "All frameworks + 1000+ answers",
            href: "/products/questionnaire-enterprise-pack",
          },
        ].map((product) => (
          <Link key={product.name} href={product.href}>
            <Card className="text-center hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{product.price}</p>
                <h3 className="font-semibold mt-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
