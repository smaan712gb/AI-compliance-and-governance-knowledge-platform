"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWizardState } from "@/hooks/use-wizard-state";
import {
  AI_ACT_ROLES,
  AI_SYSTEM_TYPES,
  GEOGRAPHIES,
  USE_CASE_CATEGORIES,
} from "@/lib/constants/ai-act-data";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { ComplianceCheckInput } from "@/lib/validators/compliance-check";

const STEPS = [
  "Your Role",
  "AI System Type",
  "Geography",
  "Use Case",
  "Results",
];

export default function ComplianceWizardPage() {
  const router = useRouter();
  const { currentStep, progress, isFirst, isLast, next, previous } =
    useWizardState({ totalSteps: STEPS.length });

  const [formData, setFormData] = useState<Partial<ComplianceCheckInput>>({
    geography: [],
  });
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return !!formData.role;
      case 1:
        return !!formData.systemType;
      case 2:
        return (formData.geography?.length || 0) > 0;
      case 3:
        return !!formData.useCase && formData.useCase.length >= 10;
      default:
        return true;
    }
  }, [currentStep, formData]);

  const handleNext = useCallback(async () => {
    if (currentStep === 3) {
      // Last input step - run the analysis
      setLoading(true);
      setError("");
      setStreamedText("");
      next();

      try {
        const res = await fetch("/api/ai/compliance-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error("Failed to run compliance check");
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
                if (parsed.text) {
                  accumulated += parsed.text;
                  setStreamedText(accumulated);
                }
              } catch {
                // Skip invalid JSON chunks
              }
            }
          }
        }
      } catch (err) {
        setError("Failed to generate compliance assessment. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      next();
    }
  }, [currentStep, formData, next]);

  const toggleGeography = (geoId: string) => {
    setFormData((prev) => {
      const current = prev.geography || [];
      return {
        ...prev,
        geography: current.includes(geoId)
          ? current.filter((g) => g !== geoId)
          : [...current, geoId],
      };
    });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AI Act Compliance Check
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

      {/* Step 0: Role Selection */}
      {currentStep === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            What is your role in relation to the AI system?
          </h2>
          <p className="text-muted-foreground mb-6">
            Your role determines which obligations apply to you under the EU AI
            Act.
          </p>
          <div className="grid gap-3">
            {AI_ACT_ROLES.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  formData.role === role.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => setFormData({ ...formData, role: role.id as ComplianceCheckInput["role"] })}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.role === role.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.role === role.id && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{role.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: System Type */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            What type of AI system are you working with?
          </h2>
          <p className="text-muted-foreground mb-6">
            The system type determines the risk classification under the EU AI
            Act.
          </p>
          <div className="grid gap-3">
            {AI_SYSTEM_TYPES.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  formData.systemType === type.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() =>
                  setFormData({ ...formData, systemType: type.id })
                }
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.systemType === type.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.systemType === type.id && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{type.label}</h3>
                      <Badge
                        variant={
                          type.riskLevel === "high" ||
                          type.riskLevel === "unacceptable_or_high"
                            ? "destructive"
                            : type.riskLevel === "gpai"
                            ? "warning"
                            : type.riskLevel === "limited"
                            ? "secondary"
                            : "success"
                        }
                        className="text-xs"
                      >
                        {type.riskLevel.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {type.examples.slice(0, 3).map((ex) => (
                        <span
                          key={ex}
                          className="text-xs bg-muted px-2 py-0.5 rounded"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Geography */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Where does your AI system operate?
          </h2>
          <p className="text-muted-foreground mb-6">
            Select all geographies where your system is deployed or impacts
            users. The EU AI Act applies if you serve EU users.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {GEOGRAPHIES.map((geo) => (
              <Card
                key={geo.id}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  formData.geography?.includes(geo.id)
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => toggleGeography(geo.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      formData.geography?.includes(geo.id)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.geography?.includes(geo.id) && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium">{geo.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Use Case */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Describe your AI use case
          </h2>
          <p className="text-muted-foreground mb-6">
            Provide details about how you use or plan to use this AI system.
            The more specific, the better your assessment.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="useCaseCategory">Industry / Category</Label>
              <select
                id="useCaseCategory"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                value={formData.useCaseCategory || ""}
                onChange={(e) =>
                  setFormData({ ...formData, useCaseCategory: e.target.value })
                }
              >
                <option value="">Select a category...</option>
                {USE_CASE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="useCase">
                Describe your use case *
              </Label>
              <Textarea
                id="useCase"
                placeholder="E.g., We use a large language model to automate customer service responses in our SaaS platform. The system processes customer queries, generates responses, and escalates complex issues to human agents..."
                className="mt-1 min-h-[120px]"
                value={formData.useCase || ""}
                onChange={(e) =>
                  setFormData({ ...formData, useCase: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 10 characters. Include: what the AI does, who it
                affects, what decisions it influences.
              </p>
            </div>

            <div>
              <Label htmlFor="additionalContext">
                Additional context (optional)
              </Label>
              <Textarea
                id="additionalContext"
                placeholder="Any additional information about your system, data handling, or compliance concerns..."
                className="mt-1"
                value={formData.additionalContext || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    additionalContext: e.target.value,
                  })
                }
              />
            </div>

            {formData.systemType === "general_purpose" && (
              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={formData.isGPAIWithSystemicRisk || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isGPAIWithSystemicRisk: e.target.checked,
                      })
                    }
                  />
                  This GPAI model has or may have systemic risk (e.g.,
                  trained with &gt;10^25 FLOPs)
                </Label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 4 && (
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Your Compliance Assessment
          </h2>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your AI system...
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive mb-4">
              {error}
            </div>
          )}
          {streamedText && (
            <Card>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {streamedText}
                </pre>
              </CardContent>
            </Card>
          )}
          {!loading && !streamedText && !error && (
            <p className="text-muted-foreground">
              Preparing your assessment...
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

        {currentStep < 4 && (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="gap-2"
          >
            {currentStep === 3 ? (
              loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Run Assessment
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
