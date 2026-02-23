"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWizardState } from "@/hooks/use-wizard-state";
import {
  INDUSTRIES,
  COMPANY_SIZES,
  REVENUE_RANGES,
  ERP_SYSTEMS,
  COMPLIANCE_DOMAINS,
  COUNTRIES,
} from "@/lib/constants/company-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Factory,
  Globe,
  Monitor,
  ShieldCheck,
  ClipboardCheck,
  CheckCircle,
  Loader2,
} from "lucide-react";

const STEPS = [
  { label: "Company Info", icon: Building2 },
  { label: "Industry", icon: Factory },
  { label: "Jurisdictions", icon: Globe },
  { label: "Technology", icon: Monitor },
  { label: "Compliance", icon: ShieldCheck },
  { label: "Review", icon: ClipboardCheck },
];

interface FormData {
  companyName: string;
  companySize: string;
  annualRevenue: string;
  industry: string;
  headquarters: string;
  operatingCountries: string[];
  erpSystem: string;
  complianceDomains: string[];
}

const INITIAL_FORM: FormData = {
  companyName: "",
  companySize: "",
  annualRevenue: "",
  industry: "",
  headquarters: "",
  operatingCountries: [],
  erpSystem: "",
  complianceDomains: [],
};

// Group countries by region for display
const COUNTRY_REGIONS = [
  { label: "Americas", value: "americas" },
  { label: "Europe", value: "europe" },
  { label: "Asia-Pacific", value: "apac" },
  { label: "Middle East & Africa", value: "mena" },
] as const;

export default function CompanyProfilePage() {
  const router = useRouter();
  const { currentStep, progress, isFirst, isLast, next, previous, goTo } =
    useWizardState({ totalSteps: STEPS.length });

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setIsExisting(true);
          setFormData({
            companyName: json.data.companyName || "",
            companySize: json.data.companySize || "",
            annualRevenue: json.data.annualRevenue || "",
            industry: json.data.industry || "",
            headquarters: json.data.headquarters || "",
            operatingCountries: json.data.operatingCountries || [],
            erpSystem: json.data.erpSystem || "",
            complianceDomains: json.data.complianceDomains || [],
          });
        }
      } catch {
        // Continue with empty form
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return formData.companyName.trim().length > 0 && formData.companySize.length > 0;
      case 1:
        return formData.industry.length > 0;
      case 2:
        return formData.headquarters.length > 0;
      case 3:
        return true; // ERP is optional
      case 4:
        return formData.complianceDomains.length > 0;
      case 5:
        return true; // Review step
      default:
        return false;
    }
  }, [currentStep, formData]);

  const toggleCountry = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      operatingCountries: prev.operatingCountries.includes(code)
        ? prev.operatingCountries.filter((c) => c !== code)
        : [...prev.operatingCountries, code],
    }));
  };

  const toggleDomain = (domain: string) => {
    setFormData((prev) => ({
      ...prev,
      complianceDomains: prev.complianceDomains.includes(domain)
        ? prev.complianceDomains.filter((d) => d !== domain)
        : [...prev.complianceDomains, domain],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const method = isExisting ? "PUT" : "POST";
      const res = await fetch("/api/companies", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          companySize: formData.companySize,
          annualRevenue: formData.annualRevenue || null,
          industry: formData.industry,
          headquarters: formData.headquarters,
          operatingCountries:
            formData.operatingCountries.length > 0
              ? formData.operatingCountries
              : [formData.headquarters],
          erpSystem: formData.erpSystem || null,
          complianceDomains: formData.complianceDomains,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        if (json.upgradeRequired) {
          setError(
            json.error ||
              "Your plan does not support this many jurisdictions. Please upgrade.",
          );
        } else {
          setError(json.error || "Failed to save company profile.");
        }
        return;
      }

      router.push("/dashboard/alerts");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get label from value
  const getLabel = (
    items: readonly { value: string; label: string }[],
    value: string,
  ) => items.find((i) => i.value === value)?.label || value;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {isExisting ? "Update Company Profile" : "Company Onboarding"}
          </h1>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-1">
          {STEPS.map((step, i) => (
            <button
              key={step.label}
              onClick={() => {
                // Only allow going back to completed steps
                if (i < currentStep) goTo(i);
              }}
              className={`text-xs ${
                i <= currentStep
                  ? "text-primary font-medium cursor-pointer"
                  : "text-muted-foreground cursor-default"
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 0: Company Info */}
      {currentStep === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Tell us about your company</h2>
          <p className="text-muted-foreground mb-6">
            Basic information helps us tailor regulatory alerts to your
            organization.
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Acme Corporation"
                className="mt-1"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
              />
            </div>

            <div>
              <Label className="mb-3 block">Company Size *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {COMPANY_SIZES.map((size) => (
                  <Card
                    key={size.value}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      formData.companySize === size.value
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, companySize: size.value })
                    }
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          formData.companySize === size.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {formData.companySize === size.value && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{size.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Annual Revenue (optional)</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {REVENUE_RANGES.map((rev) => (
                  <Card
                    key={rev.value}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      formData.annualRevenue === rev.value
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, annualRevenue: rev.value })
                    }
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          formData.annualRevenue === rev.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {formData.annualRevenue === rev.value && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{rev.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Industry */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">What industry are you in?</h2>
          <p className="text-muted-foreground mb-6">
            Your industry determines which regulations are most relevant to your
            business.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {INDUSTRIES.map((ind) => (
              <Card
                key={ind.value}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  formData.industry === ind.value
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() =>
                  setFormData({ ...formData, industry: ind.value })
                }
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.industry === ind.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.industry === ind.value && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium text-sm">{ind.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Jurisdictions */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Where does your company operate?
          </h2>
          <p className="text-muted-foreground mb-6">
            Select your headquarters and all countries where you operate. This
            determines which regulatory jurisdictions apply.
          </p>

          <div className="space-y-6">
            {/* Headquarters */}
            <div>
              <Label htmlFor="headquarters">Headquarters *</Label>
              <select
                id="headquarters"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                value={formData.headquarters}
                onChange={(e) =>
                  setFormData({ ...formData, headquarters: e.target.value })
                }
              >
                <option value="">Select country...</option>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Operating Countries - grouped by region */}
            <div>
              <Label className="mb-3 block">
                Operating Countries (optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select additional countries where you have operations, customers,
                or regulatory exposure.
              </p>

              {COUNTRY_REGIONS.map((region) => {
                const regionCountries = COUNTRIES.filter(
                  (c) => c.region === region.value,
                );

                return (
                  <div key={region.value} className="mb-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      {region.label}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {regionCountries.map((country) => {
                        const isSelected =
                          formData.operatingCountries.includes(country.value);
                        return (
                          <label
                            key={country.value}
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors text-sm ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-muted-foreground"
                              checked={isSelected}
                              onChange={() => toggleCountry(country.value)}
                            />
                            {country.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {formData.operatingCountries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 p-3 rounded-md bg-muted/50">
                  <span className="text-sm font-medium text-muted-foreground mr-2">
                    Selected ({formData.operatingCountries.length}):
                  </span>
                  {formData.operatingCountries.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleCountry(code)}
                    >
                      {getLabel(COUNTRIES, code)} x
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Technology / ERP */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">What ERP system do you use?</h2>
          <p className="text-muted-foreground mb-6">
            Knowing your ERP system helps us identify relevant compliance
            requirements for e-invoicing, tax reporting, and audit trails.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ERP_SYSTEMS.map((erp) => (
              <Card
                key={erp.value}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  formData.erpSystem === erp.value
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() =>
                  setFormData({ ...formData, erpSystem: erp.value })
                }
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.erpSystem === erp.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.erpSystem === erp.value && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium text-sm">{erp.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Compliance Domains */}
      {currentStep === 4 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Which compliance areas matter most?
          </h2>
          <p className="text-muted-foreground mb-6">
            Select all compliance domains you want to track. We will send
            regulatory alerts for these areas. Select at least one.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {COMPLIANCE_DOMAINS.map((domain) => {
              const isSelected = formData.complianceDomains.includes(
                domain.value,
              );
              return (
                <Card
                  key={domain.value}
                  className={`cursor-pointer transition-colors hover:border-primary ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleDomain(domain.value)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{domain.label}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {formData.complianceDomains.length === 0 && (
            <p className="text-sm text-destructive mt-3">
              Please select at least one compliance domain.
            </p>
          )}
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {currentStep === 5 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Review Your Profile</h2>
          <p className="text-muted-foreground mb-6">
            Confirm your company information before{" "}
            {isExisting ? "updating" : "creating"} your profile.
          </p>

          <Card className="mb-6">
            <CardContent className="divide-y py-0">
              {/* Company Info */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Company Info
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goTo(0)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {formData.companyName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Size:</span>{" "}
                    {getLabel(COMPANY_SIZES, formData.companySize)}
                  </p>
                  {formData.annualRevenue && (
                    <p>
                      <span className="text-muted-foreground">Revenue:</span>{" "}
                      {getLabel(REVENUE_RANGES, formData.annualRevenue)}
                    </p>
                  )}
                </div>
              </div>

              {/* Industry */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Factory className="h-4 w-4 text-muted-foreground" />
                    Industry
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goTo(1)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-sm">
                  {getLabel(INDUSTRIES, formData.industry)}
                </p>
              </div>

              {/* Jurisdictions */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Jurisdictions
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goTo(2)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <div className="text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">HQ:</span>{" "}
                    {getLabel(COUNTRIES, formData.headquarters)}
                  </p>
                  {formData.operatingCountries.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.operatingCountries.map((code) => (
                        <Badge key={code} variant="secondary" className="text-xs">
                          {getLabel(COUNTRIES, code)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ERP */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    ERP System
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goTo(3)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-sm">
                  {formData.erpSystem
                    ? getLabel(ERP_SYSTEMS, formData.erpSystem)
                    : "Not specified"}
                </p>
              </div>

              {/* Compliance Domains */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    Compliance Domains
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goTo(4)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.complianceDomains.map((d) => (
                    <Badge key={d} variant="default" className="text-xs">
                      {getLabel(COMPLIANCE_DOMAINS, d)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isExisting ? "Updating..." : "Creating Profile..."}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {isExisting ? "Update Profile" : "Create Profile"}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={previous}
            disabled={isFirst}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={next}
            disabled={!canProceed()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {currentStep === 5 && (
        <div className="flex items-center justify-start mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={previous}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
