export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import { CheckCircle, ShieldCheck, Download, ArrowRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await db.digitalProduct.findUnique({
    where: { slug },
  });

  if (!product) return {};

  return buildMetadata({
    title: `${product.name} - AI Compliance Toolkit`,
    description: product.shortDescription || product.description.slice(0, 160),
    path: `/products/${slug}`,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await db.digitalProduct.findUnique({
    where: { slug, isActive: true },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-5 max-w-6xl mx-auto">
        {/* Product Info */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{product.category.replace(/_/g, " ")}</Badge>
            {product.isFeatured && <Badge>Featured</Badge>}
          </div>

          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {product.description}
          </p>

          {/* Features */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">What&apos;s Included</h2>
            <ul className="space-y-3">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust Signals */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Download className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Instant Download</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Secure Payment</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Regular Updates</p>
            </div>
          </div>
        </div>

        {/* Purchase Card */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">
                  ${(product.price / 100).toFixed(0)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${(product.compareAtPrice / 100).toFixed(0)}
                  </span>
                )}
              </div>
              {product.compareAtPrice && (
                <Badge variant="success" className="mb-4">
                  Save $
                  {((product.compareAtPrice - product.price) / 100).toFixed(0)}
                </Badge>
              )}

              <form action="/api/stripe/checkout" method="POST">
                <input type="hidden" name="productId" value={product.id} />
                <input
                  type="hidden"
                  name="priceId"
                  value={product.stripePriceId || ""}
                />
                <input type="hidden" name="mode" value="payment" />
                <Button type="submit" className="w-full gap-2" size="lg">
                  Buy Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-3">
                One-time payment. Instant access. Secure checkout via Stripe.
              </p>

              <div className="mt-6 pt-6 border-t space-y-2 text-sm text-muted-foreground">
                <p>Includes:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Downloadable files (PDF, DOCX, XLSX)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Free updates for 12 months
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Email support
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
