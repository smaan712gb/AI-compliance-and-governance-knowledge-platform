"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useWizardState } from "@/hooks/use-wizard-state";
import {
  ERP_SYSTEMS,
  COUNTRIES,
  INDUSTRIES,
  COMPLIANCE_DOMAINS,
} from "@/lib/constants/company-data";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle,
  Loader2,
  Server,
  Globe,
  Building2,
} from "lucide-react";

// ---- Types ----

interface ERPFormData {
  erpSystem: string;
  countries: string[];
  industry: string;
}

interface StaticAnalysisData {
  erpSystem: { id: string; name: string; vendor: string };
  summary: {
    total: number;
    native: number;
    addon: number;
    partner: number;
    gap: number;
    criticalGaps: number;
  };
  gaps: Array<{
    regulationId: string;
    regulationName: string;
    domain: string;
    jurisdiction: string;
    deadline: string | null;
    coverage: "NATIVE" | "ADDON" | "PARTNER" | "GAP";
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  }>;
}

// ---- Region grouping for countries ----

const REGION_LABELS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  apac: "Asia-Pacific",
  mena: "Middle East & Africa",
};

const REGIONS = Object.keys(REGION_LABELS) as Array<keyof typeof REGION_LABELS>;

function getCountriesByRegion(region: string) {
  return COUNTRIES.filter((c) => c.region === region);
}

// ---- Steps ----

const STEPS = ["ERP System", "Countries", "Industry", "Results"];

export default function ERPAnalysisWizardPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { currentStep, progress, isFirst, isLast, next, previous } =
    useWizardState({ totalSteps: STEPS.length });

  const [formData, setFormData] = useState<ERPFormData>({
    erpSystem: "",
    countries: [],
    industry: "",
  });

  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [staticAnalysis, setStaticAnalysis] =
    useState<StaticAnalysisData | null>(null);
  const [error, setError] = useState("");

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return !!formData.erpSystem;
      case 1:
        return formData.countries.length > 0;
      case 2:
        return !!formData.industry;
      default:
        return true;
    }
  }, [currentStep, formData]);

  const toggleCountry = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter((c) => c !== code)
        : [...prev.countries, code],
    }));
  };

  const handleNext = useCallback(async () => {
    if (currentStep === 2) {
      // Last input step - run the analysis
      setLoading(true);
      setError("");
      setStreamedText("");
      setStaticAnalysis(null);
      next();

      try {
        const res = await fetch("/api/ai/erp-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const message =
            errBody?.error?.message || "Failed to run ERP analysis.";
          throw new Error(message);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);

                // Handle static analysis event
                if (parsed.type === "static_analysis") {
                  setStaticAnalysis(parsed.data);
                }

                // Handle streamed text
                if (parsed.text) {
                  accumulated += parsed.text;
                  setStreamedText(accumulated);
                }

                // Handle error from stream
                if (parsed.error) {
                  setError(parsed.error);
                }
              } catch {
                // Skip invalid JSON chunks
              }
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate ERP analysis. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    } else {
      next();
    }
  }, [currentStep, formData, next]);

  // ---- Coverage badge variant helper ----
  const coverageVariant = (
    coverage: string,
  ): "success" | "warning" | "secondary" | "destructive" => {
    switch (coverage) {
      case "NATIVE":
        return "success";
      case "ADDON":
        return "secondary";
      case "PARTNER":
        return "warning";
      case "GAP":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const urgencyVariant = (
    urgency: string,
  ): "destructive" | "warning" | "secondary" | "default" => {
    switch (urgency) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "default";
      default:
        return "secondary";
    }
  };

  // Gate: require authentication
  if (sessionStatus === "loading") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold">Sign In Required</h2>
            <p className="text-muted-foreground">
              ERP Compliance Gap Analysis is available to Professional and
              Enterprise subscribers. Please sign in to continue.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login?callbackUrl=/erp-analysis/wizard"
                className={buttonVariants({ variant: "default" })}
              >
                Sign In
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ variant: "outline" })}
              >
                View Plans
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            ERP Compliance Gap Analysis
          </h1>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-1">
          {STEPS.map((step, i) => (
            <span
              key={step}
              className={`text-xs ${
                i <= currentStep
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Step 0: ERP System Selection */}
      {currentStep === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Which ERP system do you use?
          </h2>
          <p className="text-muted-foreground mb-6">
            Select your primary ERP system so we can check which regulatory
            mandates it covers natively, via add-ons, or not at all.
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
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{erp.label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Operating Countries */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Where does your company operate?
          </h2>
          <p className="text-muted-foreground mb-6">
            Select all countries where you have legal entities, offices, or
            serve customers. We will identify the regulatory mandates that apply
            in each jurisdiction.
          </p>
          {formData.countries.length > 0 && (
            <p className="text-sm text-primary font-medium mb-4">
              {formData.countries.length} countr
              {formData.countries.length === 1 ? "y" : "ies"} selected
            </p>
          )}
          <div className="space-y-6">
            {REGIONS.map((region) => {
              const regionCountries = getCountriesByRegion(region);
              if (regionCountries.length === 0) return null;
              return (
                <div key={region}>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {REGION_LABELS[region]}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {regionCountries.map((country) => (
                      <Card
                        key={country.value}
                        className={`cursor-pointer transition-colors hover:border-primary ${
                          formData.countries.includes(country.value)
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => toggleCountry(country.value)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <div
                            className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              formData.countries.includes(country.value)
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {formData.countries.includes(country.value) && (
                              <CheckCircle className="h-2.5 w-2.5 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm">
                            <span className="font-medium">
                              {country.label}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              ({country.value})
                            </span>
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Industry Selection */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            What is your industry?
          </h2>
          <p className="text-muted-foreground mb-6">
            Your industry determines which additional regulations apply. For
            example, financial services are subject to DORA, while energy
            companies must comply with NIS2.
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
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{ind.label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Your ERP Gap Analysis
          </h2>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your ERP compliance gaps...
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Static Analysis Summary */}
          {staticAnalysis && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  {staticAnalysis.erpSystem.name} - Coverage Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {staticAnalysis.summary.total}
                    </div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {staticAnalysis.summary.native}
                    </div>
                    <div className="text-muted-foreground">Native</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {staticAnalysis.summary.addon}
                    </div>
                    <div className="text-muted-foreground">Add-on</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {staticAnalysis.summary.partner}
                    </div>
                    <div className="text-muted-foreground">Partner</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {staticAnalysis.summary.gap}
                    </div>
                    <div className="text-muted-foreground">Gaps</div>
                  </div>
                </div>

                {staticAnalysis.summary.criticalGaps > 0 && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {staticAnalysis.summary.criticalGaps} critical/high-urgency
                    gap{staticAnalysis.summary.criticalGaps !== 1 ? "s" : ""}{" "}
                    detected. See the detailed report below.
                  </div>
                )}

                {/* Regulation list */}
                <div className="mt-4 space-y-2">
                  {staticAnalysis.gaps.map((gap) => (
                    <div
                      key={gap.regulationId}
                      className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {gap.regulationName}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({gap.jurisdiction})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={urgencyVariant(gap.urgency)}>
                          {gap.urgency}
                        </Badge>
                        <Badge variant={coverageVariant(gap.coverage)}>
                          {gap.coverage}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streamed AI Response */}
          {streamedText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Detailed Analysis & Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                  {streamedText}
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating recommendations...
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!loading && !streamedText && !staticAnalysis && !error && (
            <p className="text-muted-foreground">
              Preparing your analysis...
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
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

        {currentStep < 3 && (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="gap-2"
          >
            {currentStep === 2 ? (
              loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Run Analysis
                  <ArrowRight className="h-4 w-4" />
                </>
              )
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
