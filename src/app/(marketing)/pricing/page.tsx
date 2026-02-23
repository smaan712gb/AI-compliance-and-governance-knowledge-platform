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
  title: "Pricing - Compliance Intelligence & Regulatory Tools",
  description:
    "Pricing for AIGovHub compliance intelligence platform. Free tools, Starter from $99/mo, Professional from $499/mo with ERP analysis and vendor assessments.",
  path: "/pricing",
});

const subscriptionTiers = [
  {
    name: "Free",
    price: 0,
    description: "Explore compliance content and basic tools",
    features: [
      { text: "Blog content across all compliance domains", included: true },
      { text: "1 jurisdiction tracker", included: true },
      { text: "Vendor directory access", included: true },
      { text: "3 compliance checks/month", included: true },
      { text: "Regulatory alerts", included: false },
      { text: "Vendor assessments", included: false },
      { text: "ERP gap analysis", included: false },
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
    variant: "outline" as const,
  },
  {
    name: "Starter",
    price: 99,
    description: "For teams starting their compliance journey",
    features: [
      { text: "Everything in Free", included: true },
      { text: "3 jurisdiction trackers", included: true },
      { text: "Personalized regulatory alerts", included: true },
      { text: "5 vendor assessments/month", included: true },
      { text: "Unlimited compliance checks", included: true },
      { text: "Priority email support", included: true },
      { text: "ERP gap analysis", included: false },
    ],
    cta: "Get Started",
    ctaHref: "/dashboard/subscription",
    variant: "outline" as const,
  },
  {
    name: "Professional",
    price: 499,
    description: "For organizations with multi-jurisdiction needs",
    badge: "Most Popular",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "10 jurisdiction trackers", included: true },
      { text: "25 vendor assessments/month", included: true },
      { text: "ERP compliance gap analysis", included: true },
      { text: "Document generation", included: true },
      { text: "PDF & DOCX export", included: true },
      { text: "API access", included: false },
    ],
    cta: "Start Professional",
    ctaHref: "/dashboard/subscription",
    variant: "default" as const,
  },
  {
    name: "Enterprise",
    price: 2000,
    description: "For global enterprises with complex compliance",
    features: [
      { text: "Everything in Professional", included: true },
      { text: "Unlimited jurisdictions", included: true },
      { text: "Unlimited vendor assessments", included: true },
      { text: "API access (1000 req/day)", included: true },
      { text: "SSO & SAML", included: true },
      { text: "Custom reports & integrations", included: true },
      { text: "Dedicated support", included: true },
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto mb-20">
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
                  {tier.price === 0
                    ? "Free"
                    : `$${tier.price.toLocaleString()}`}
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
