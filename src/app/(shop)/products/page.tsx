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
import { CheckCircle, ArrowRight } from "lucide-react";

export const metadata = buildMetadata({
  title: "Compliance Toolkits & Templates",
  description:
    "Ready-to-use AI Act compliance toolkits, security questionnaire packs, and policy templates. Start from $49.",
  path: "/products",
});

const products = [
  {
    slug: "ai-act-starter-toolkit",
    name: "AI Act Starter Toolkit",
    description:
      "Essential templates and checklists for EU AI Act compliance. Perfect for small teams getting started.",
    price: 49,
    compareAtPrice: null,
    badge: null,
    features: [
      "Risk classification worksheet",
      "Basic obligations checklist",
      "AI policy template",
      "Compliance timeline tracker",
      "DPIA template (basic)",
    ],
  },
  {
    slug: "ai-act-pro-toolkit",
    name: "AI Act Professional Toolkit",
    description:
      "Comprehensive compliance package with legal-reviewed templates. For organizations with high-risk AI systems.",
    price: 199,
    compareAtPrice: 299,
    badge: "Most Popular",
    features: [
      "Everything in Starter, plus:",
      "Detailed FRIA template",
      "Technical documentation framework",
      "Quality management system template",
      "Post-market monitoring plan",
      "Conformity assessment guide",
      "Incident reporting procedures",
      "Human oversight protocols",
      "Vendor AI governance clause templates",
    ],
  },
  {
    slug: "questionnaire-basic-pack",
    name: "Security Questionnaire Basic Pack",
    description:
      "SOC 2 and ISO 27001 mapped questionnaire templates with pre-written answers for AI systems.",
    price: 99,
    compareAtPrice: null,
    badge: null,
    features: [
      "500+ pre-written answers",
      "SOC 2 Trust Criteria mapping",
      "ISO 27001 Annex A mapping",
      "AI-specific security controls",
      "Vendor assessment template",
      "Editable Word/Excel formats",
    ],
  },
  {
    slug: "questionnaire-enterprise-pack",
    name: "Security Questionnaire Enterprise Pack",
    description:
      "Complete security questionnaire automation with HIPAA, PCI, NIST AI RMF, and custom framework support.",
    price: 499,
    compareAtPrice: 699,
    badge: "Best Value",
    features: [
      "Everything in Basic Pack, plus:",
      "1000+ pre-written answers",
      "HIPAA mapping",
      "PCI DSS mapping",
      "NIST AI RMF mapping",
      "NIST CSF 2.0 mapping",
      "Custom questionnaire builder",
      "Evidence artifact templates",
      "Model card templates",
      "Data flow diagrams",
    ],
  },
];

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Compliance Toolkits & Templates</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Ready-to-use templates, checklists, and policy packs to accelerate
          your AI governance and compliance journey. Download instantly.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
        {products.map((product) => (
          <Card key={product.slug} className="relative flex flex-col">
            {product.badge && (
              <Badge className="absolute -top-2.5 left-4">
                {product.badge}
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">${product.price}</span>
                {product.compareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ${product.compareAtPrice}
                  </span>
                )}
                <span className="text-muted-foreground">one-time</span>
              </div>
              <ul className="space-y-2">
                {product.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href={`/products/${product.slug}`} className="w-full">
                <Button className="w-full gap-2">
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
