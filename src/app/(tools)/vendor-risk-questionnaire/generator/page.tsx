"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Loader2, FileCheck, ArrowRight } from "lucide-react";

const MODEL_TYPES = [
  "Large Language Model (LLM)",
  "Image Generation / Computer Vision",
  "Speech / Audio AI",
  "Recommendation Engine",
  "Predictive Analytics / ML Model",
  "Robotic Process Automation (RPA)",
  "Custom / Proprietary Model",
  "Other",
];

const DEPLOYMENT_OPTIONS = [
  "Cloud-hosted (vendor managed)",
  "Self-hosted / On-premises",
  "API integration",
  "Embedded in product",
  "Edge / On-device",
  "Hybrid (cloud + on-prem)",
];

export default function QuestionnaireGeneratorPage() {
  const [formData, setFormData] = useState({
    vendorName: "",
    modelType: "",
    dataHandling: "",
    deployment: "",
    specificConcerns: "",
  });
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStreamedText("");

    try {
      const res = await fetch("/api/ai/questionnaire-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to generate questionnaire");

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
              // skip
            }
          }
        }
      }
    } catch {
      setError("Failed to generate questionnaire. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <FileCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">
          AI Vendor Risk Questionnaire Generator
        </h1>
      </div>

      {!streamedText ? (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Vendor Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    value={formData.vendorName}
                    onChange={(e) => update("vendorName", e.target.value)}
                    placeholder="e.g., OpenAI, Anthropic, Cohere"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="modelType">AI Model Type *</Label>
                  <Select
                    id="modelType"
                    value={formData.modelType}
                    onChange={(e) => update("modelType", e.target.value)}
                    required
                    className="mt-1"
                  >
                    <option value="">Select model type...</option>
                    {MODEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deployment">Deployment Model *</Label>
                  <Select
                    id="deployment"
                    value={formData.deployment}
                    onChange={(e) => update("deployment", e.target.value)}
                    required
                    className="mt-1"
                  >
                    <option value="">Select deployment model...</option>
                    {DEPLOYMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dataHandling">
                    Data Handling Description *
                  </Label>
                  <Textarea
                    id="dataHandling"
                    value={formData.dataHandling}
                    onChange={(e) => update("dataHandling", e.target.value)}
                    placeholder="Describe what data the AI system processes, where it's stored, who has access, data residency requirements, etc."
                    required
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="specificConcerns">
                    Specific Concerns (optional)
                  </Label>
                  <Textarea
                    id="specificConcerns"
                    value={formData.specificConcerns}
                    onChange={(e) =>
                      update("specificConcerns", e.target.value)
                    }
                    placeholder="Any specific risks, regulatory requirements, or areas of focus for this assessment..."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Questionnaire...
                </>
              ) : (
                <>
                  Generate Questionnaire
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Generated Questionnaire for {formData.vendorName}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStreamedText("");
                  setFormData({
                    vendorName: "",
                    modelType: "",
                    dataHandling: "",
                    deployment: "",
                    specificConcerns: "",
                  });
                }}
              >
                New Questionnaire
              </Button>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </div>
          )}
          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {streamedText}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
