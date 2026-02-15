import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await db.digitalProduct.findUnique({ where: { id } });
  if (!product) notFound();

  async function updateProduct(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const price = Math.round(parseFloat(formData.get("price") as string) * 100);
    const type = formData.get("type") as string;
    const category = formData.get("category") as string;
    const stripePriceId = formData.get("stripePriceId") as string;
    const isActive = formData.get("isActive") === "true";

    await db.digitalProduct.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        price,
        type: type as "ONE_TIME" | "SUBSCRIPTION" | "FREE",
        category: category as "AI_ACT_TOOLKIT" | "SECURITY_QUESTIONNAIRE" | "POLICY_PACK" | "TEMPLATE_BUNDLE" | "SUBSCRIPTION_PLAN",
        stripePriceId: stripePriceId || null,
        isActive,
      },
    });

    redirect("/admin/products");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit: {product.name}</h1>
      <form action={updateProduct}>
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={product.name} required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={product.slug} required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={product.description} rows={4} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={(product.price / 100).toFixed(2)} required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" defaultValue={product.type} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="ONE_TIME">One-Time</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="FREE">Free</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select id="category" name="category" defaultValue={product.category} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="AI_ACT_TOOLKIT">AI Act Toolkit</option>
                  <option value="SECURITY_QUESTIONNAIRE">Security Questionnaire</option>
                  <option value="POLICY_PACK">Policy Pack</option>
                  <option value="TEMPLATE_BUNDLE">Template Bundle</option>
                  <option value="SUBSCRIPTION_PLAN">Subscription Plan</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stripePriceId">Stripe Price ID</Label>
                <Input id="stripePriceId" name="stripePriceId" defaultValue={product.stripePriceId || ""} />
              </div>
              <div>
                <Label htmlFor="isActive">Status</Label>
                <select id="isActive" name="isActive" defaultValue={product.isActive ? "true" : "false"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <Button type="submit">Save Changes</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
