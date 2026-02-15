"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "AI_GOVERNANCE_PLATFORM",
  "MODEL_RISK_MANAGEMENT",
  "BIAS_FAIRNESS_TESTING",
  "EXPLAINABILITY_TOOLS",
  "DATA_GOVERNANCE",
  "PRIVACY_COMPLIANCE",
  "SECURITY_POSTURE",
  "AUDIT_ASSURANCE",
];

const PRICING_MODELS = [
  "FREE",
  "FREEMIUM",
  "SUBSCRIPTION",
  "PER_SEAT",
  "PER_MODEL",
  "USAGE_BASED",
  "ENTERPRISE_ONLY",
  "CONTACT_SALES",
];

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      shortDescription: formData.get("shortDescription"),
      websiteUrl: formData.get("websiteUrl"),
      category: formData.get("category"),
      pricingModel: formData.get("pricingModel"),
      pricingStartsAt: formData.get("pricingStartsAt"),
      hasFreeTrialOrTier: formData.get("hasFreeTrialOrTier") === "on",
      frameworksSupported: (formData.get("frameworksSupported") as string)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [],
      overallScore: formData.get("overallScore")
        ? parseFloat(formData.get("overallScore") as string)
        : null,
      hasDPA: formData.get("hasDPA") === "on",
      gdprCompliant: formData.get("gdprCompliant") === "on",
      soc2Certified: formData.get("soc2Certified") === "on",
      iso27001Certified: formData.get("iso27001Certified") === "on",
      affiliateUrl: formData.get("affiliateUrl"),
      isPublished: formData.get("isPublished") === "on",
    };

    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || "Failed to create vendor");
        setLoading(false);
        return;
      }

      router.push("/admin/vendors");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/vendors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Vendor</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 max-w-3xl">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    required
                    placeholder="vendor-name"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="websiteUrl">Website URL *</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  name="shortDescription"
                  className="mt-1"
                  placeholder="One-line summary"
                />
              </div>
              <div>
                <Label htmlFor="description">Full Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  className="mt-1 min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    name="category"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="pricingModel">Pricing Model *</Label>
                  <select
                    id="pricingModel"
                    name="pricingModel"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  >
                    {PRICING_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="pricingStartsAt">Pricing Starts At</Label>
                  <Input
                    id="pricingStartsAt"
                    name="pricingStartsAt"
                    placeholder="$500/mo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="overallScore">Overall Score (1-10)</Label>
                  <Input
                    id="overallScore"
                    name="overallScore"
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="frameworksSupported">
                  Frameworks Supported (comma-separated)
                </Label>
                <Input
                  id="frameworksSupported"
                  name="frameworksSupported"
                  placeholder="SOC2, ISO27001, EU_AI_ACT, NIST, HIPAA"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { id: "hasFreeTrialOrTier", label: "Has Free Trial/Tier" },
                  { id: "hasDPA", label: "Has DPA" },
                  { id: "gdprCompliant", label: "GDPR Compliant" },
                  { id: "soc2Certified", label: "SOC 2 Certified" },
                  { id: "iso27001Certified", label: "ISO 27001 Certified" },
                  { id: "isPublished", label: "Published" },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name={item.id}
                      className="rounded"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <div>
                <Label htmlFor="affiliateUrl">Affiliate URL</Label>
                <Input
                  id="affiliateUrl"
                  name="affiliateUrl"
                  type="url"
                  className="mt-1"
                  placeholder="https://partner.example.com/?ref=aigovhub"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Vendor"
              )}
            </Button>
            <Link href="/admin/vendors">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
