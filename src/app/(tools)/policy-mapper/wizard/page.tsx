"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { FRAMEWORKS, POLICY_DOMAINS } from "@/lib/constants/policy-mapper-data";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/constants/company-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function PolicyMapperWizardPage() {
  const wizard = useWizardState({ totalSteps: 4 });

  // Form state
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [policyDomain, setPolicyDomain] = useState<string>("");
  const [policyText, setPolicyText] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [concerns, setConcerns] = useState("");

  // Results state
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleFramework = (value: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0:
        return selectedFrameworks.length >= 1;
      case 1:
        return policyDomain || policyText.trim().length > 0;
      case 2:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (wizard.currentStep === 2) {
      // Moving to results — trigger analysis
      wizard.next();
      runAnalysis();
    } else {
      wizard.next();
    }
  };

  const runAnalysis = async () => {
    setIsStreaming(true);
    setStreamedText("");
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/policy-mapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworks: selectedFrameworks,
          policyDomain: policyDomain || undefined,
          policyText: policyText || undefined,
          industry: industry || undefined,
          companySize: companySize || undefined,
          concerns: concerns || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Request failed with status ${res.status}`
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setStreamedText((prev) => prev + parsed.text);
              }
              if (parsed.error) {
                setError(parsed.error);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Policy-to-Control Mapping</h1>
        <p className="text-muted-foreground mb-6">
          Map your policies across 9 compliance frameworks with cross-framework overlap analysis.
        </p>

        <Progress value={wizard.progress} className="mb-8" />

        {/* Step 0: Select Frameworks */}
        {wizard.currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Select Compliance Frameworks
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the frameworks you need to comply with. Select multiple to see cross-framework overlaps.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {FRAMEWORKS.map((fw) => {
                const selected = selectedFrameworks.includes(fw.value);
                return (
                  <Card
                    key={fw.value}
                    className={`cursor-pointer transition-colors ${
                      selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => toggleFramework(fw.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{fw.label}</h3>
                            {selected && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fw.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                          {fw.controlPrefix}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {selectedFrameworks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {selectedFrameworks.length} framework{selectedFrameworks.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        {/* Step 1: Policy Domain or Text */}
        {wizard.currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Define Policy Scope
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a policy domain OR paste your existing policy text for direct mapping.
            </p>

            <Label className="mb-2 block font-medium">Policy Domain</Label>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {POLICY_DOMAINS.map((domain) => {
                const selected = policyDomain === domain.value;
                return (
                  <Card
                    key={domain.value}
                    className={`cursor-pointer transition-colors ${
                      selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setPolicyDomain(selected ? "" : domain.value)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        {selected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                        <span className="text-sm font-medium">{domain.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste policy text
                </span>
              </div>
            </div>

            <Label htmlFor="policyText" className="mb-2 block font-medium">
              Policy Text (optional)
            </Label>
            <Textarea
              id="policyText"
              placeholder="Paste your existing policy text here and we'll map each clause to specific framework controls..."
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              rows={8}
            />
          </div>
        )}

        {/* Step 2: Organization Context */}
        {wizard.currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Organization Context (Optional)
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Adding context helps tailor the mapping to your specific situation.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="industry" className="mb-2 block font-medium">
                  Industry
                </Label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="companySize" className="mb-2 block font-medium">
                  Company Size
                </Label>
                <select
                  id="companySize"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select size...</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="concerns" className="mb-2 block font-medium">
                  Specific Concerns
                </Label>
                <Textarea
                  id="concerns"
                  placeholder="Any specific compliance concerns, upcoming audits, or areas of focus..."
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {wizard.currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Your Policy-to-Control Mapping
            </h2>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
                {error}
              </div>
            )}

            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing policies across {selectedFrameworks.length} frameworks...
              </div>
            )}

            {streamedText && (
              <Card>
                <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(streamedText),
                    }}
                  />
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={wizard.previous}
            disabled={wizard.isFirst || isStreaming}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {wizard.currentStep < 3 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              {wizard.currentStep === 2 ? "Generate Mapping" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {wizard.currentStep === 3 && !isStreaming && streamedText && (
            <Button
              variant="outline"
              onClick={() => {
                wizard.reset();
                setStreamedText("");
                setSelectedFrameworks([]);
                setPolicyDomain("");
                setPolicyText("");
                setConcerns("");
                setError(null);
              }}
            >
              Start Over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Simple markdown-to-HTML for streaming content */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2"><input type="checkbox" disabled /> $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2"><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(
      /\|(.+)\|/g,
      (match) => {
        const cells = match.split("|").filter(Boolean);
        if (cells.every((c) => c.trim().match(/^[-:]+$/))) return "";
        const tag = "td";
        return `<tr>${cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join("")}</tr>`;
      }
    );
}
