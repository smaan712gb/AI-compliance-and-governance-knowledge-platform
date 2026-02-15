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

export default async function EditVendorPage({ params }: Props) {
  const { id } = await params;
  const vendor = await db.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  async function updateVendor(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const websiteUrl = formData.get("website") as string;
    const category = formData.get("category") as string;
    const pricingModel = formData.get("pricingModel") as string;
    const overallScore = formData.get("overallScore") ? parseFloat(formData.get("overallScore") as string) : null;
    const affiliateUrl = formData.get("affiliateUrl") as string;

    await db.vendor.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        shortDescription: shortDescription || null,
        websiteUrl,
        category: category as "AI_GOVERNANCE_PLATFORM" | "MODEL_RISK_MANAGEMENT" | "BIAS_FAIRNESS_TESTING" | "EXPLAINABILITY_TOOLS" | "DATA_GOVERNANCE" | "PRIVACY_COMPLIANCE" | "SECURITY_POSTURE" | "AUDIT_ASSURANCE",
        pricingModel: pricingModel as "FREE" | "FREEMIUM" | "SUBSCRIPTION" | "PER_SEAT" | "PER_MODEL" | "USAGE_BASED" | "ENTERPRISE_ONLY" | "CONTACT_SALES",
        overallScore,
        affiliateUrl: affiliateUrl || null,
      },
    });

    redirect("/admin/vendors");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit: {vendor.name}</h1>
      <form action={updateVendor}>
        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={vendor.name} required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={vendor.slug} required />
              </div>
            </div>
            <div>
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input id="shortDescription" name="shortDescription" defaultValue={vendor.shortDescription || ""} />
            </div>
            <div>
              <Label htmlFor="description">Full Description</Label>
              <Textarea id="description" name="description" defaultValue={vendor.description} rows={4} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={vendor.websiteUrl} required />
              </div>
              <div>
                <Label htmlFor="affiliateUrl">Affiliate URL</Label>
                <Input id="affiliateUrl" name="affiliateUrl" defaultValue={vendor.affiliateUrl || ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select id="category" name="category" defaultValue={vendor.category} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="AI_GOVERNANCE_PLATFORM">AI Governance Platform</option>
                  <option value="MODEL_RISK_MANAGEMENT">Model Risk Management</option>
                  <option value="BIAS_FAIRNESS_TESTING">Bias & Fairness Testing</option>
                  <option value="EXPLAINABILITY_TOOLS">Explainability Tools</option>
                  <option value="DATA_GOVERNANCE">Data Governance</option>
                  <option value="PRIVACY_COMPLIANCE">Privacy Compliance</option>
                  <option value="SECURITY_POSTURE">Security Posture</option>
                  <option value="AUDIT_ASSURANCE">Audit & Assurance</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pricingModel">Pricing Model</Label>
                <select id="pricingModel" name="pricingModel" defaultValue={vendor.pricingModel || ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option value="FREE">Free</option>
                  <option value="FREEMIUM">Freemium</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="PER_SEAT">Per Seat</option>
                  <option value="PER_MODEL">Per Model</option>
                  <option value="USAGE_BASED">Usage Based</option>
                  <option value="ENTERPRISE_ONLY">Enterprise Only</option>
                  <option value="CONTACT_SALES">Contact Sales</option>
                </select>
              </div>
              <div>
                <Label htmlFor="overallScore">Overall Score (0-10)</Label>
                <Input id="overallScore" name="overallScore" type="number" step="0.1" min="0" max="10" defaultValue={vendor.overallScore || ""} />
              </div>
            </div>
            <Button type="submit">Save Changes</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
