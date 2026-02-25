"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  PCI_COMPLIANCE_DOMAINS,
  PCI_JURISDICTIONS,
  SAQ_TYPES,
  MERCHANT_LEVELS,
  PCI_SYSTEMS_USED,
  PCI_COMPLIANCE_CONCERNS,
} from "@/lib/constants/pci-compliance-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function PCIComplianceWizardPage() {
  const wizard = useWizardState({ totalSteps: 5 });

  const [domain, setDomain] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [saqType, setSaqType] = useState("");
  const [merchantLevel, setMerchantLevel] = useState("");
  const [systemsUsed, setSystemsUsed] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleJurisdiction = (value: string) => {
    setJurisdictions((prev) =>
      prev.includes(value) ? prev.filter((j) => j !== value) : [...prev, value]
    );
  };

  const toggleSystem = (value: string) => {
    setSystemsUsed((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleConcern = (value: string) => {
    setConcerns((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0: return !!domain;
      case 1: return jurisdictions.length > 0;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (wizard.currentStep === 3) {
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
      const res = await fetch("/api/ai/pci-compliance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          jurisdictions,
          saqType: saqType || undefined,
          merchantLevel: merchantLevel || undefined,
          systemsUsed: systemsUsed.length > 0 ? systemsUsed : undefined,
          concerns: concerns.length > 0 ? concerns : undefined,
          additionalContext: additionalContext || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || `Status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

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
              const p = JSON.parse(data);
              if (p.text) setStreamedText((prev) => prev + p.text);
              if (p.error) setError(p.error);
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
        <h1 className="text-2xl font-bold mb-2">PCI DSS Compliance Checker</h1>
        <p className="text-muted-foreground mb-6">
          Assess your PCI DSS compliance obligations across payment security requirements and card brand programs.
        </p>
        <Progress value={wizard.progress} className="mb-8" />

        {/* Step 0: Select Domain */}
        {wizard.currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Requirement Domain</h2>
            <div className="grid gap-3">
              {PCI_COMPLIANCE_DOMAINS.map((d) => {
                const selected = domain === d.value;
                return (
                  <Card
                    key={d.value}
                    className={`cursor-pointer transition-colors ${
                      selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setDomain(d.value)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      {selected && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                      <div>
                        <h3 className="font-medium">{d.label}</h3>
                        <p className="text-sm text-muted-foreground">{d.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Select Jurisdictions / Programs */}
        {wizard.currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Select Programs & Jurisdictions <span className="text-destructive">*</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the PCI standard, card brand programs, and any regional regulations that apply.
            </p>

            {["global", "card_brand", "regional"].map((region) => {
              const regionJurisdictions = PCI_JURISDICTIONS.filter((j) => j.region === region);
              const regionLabel = region === "global" ? "Global Standard" : region === "card_brand" ? "Card Brand Programs" : "Regional Regulations";
              return (
                <div key={region} className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{regionLabel}</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {regionJurisdictions.map((j) => {
                      const selected = jurisdictions.includes(j.value);
                      return (
                        <button
                          key={j.value}
                          type="button"
                          onClick={() => toggleJurisdiction(j.value)}
                          className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                            selected
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-input hover:border-primary/50"
                          }`}
                        >
                          {j.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Organization Context */}
        {wizard.currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Organization Context (Optional)</h2>

            <div>
              <Label className="mb-2 block">SAQ Type</Label>
              <div className="grid gap-2">
                {SAQ_TYPES.map((saq) => {
                  const selected = saqType === saq.value;
                  return (
                    <button
                      key={saq.value}
                      type="button"
                      onClick={() => setSaqType(saq.value)}
                      className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      {saq.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Merchant / Service Provider Level</Label>
              <div className="grid gap-2">
                {MERCHANT_LEVELS.map((ml) => {
                  const selected = merchantLevel === ml.value;
                  return (
                    <button
                      key={ml.value}
                      type="button"
                      onClick={() => setMerchantLevel(ml.value)}
                      className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      {ml.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Payment Systems & Security Tools</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {PCI_SYSTEMS_USED.map((sys) => {
                  const selected = systemsUsed.includes(sys.value);
                  return (
                    <button
                      key={sys.value}
                      type="button"
                      onClick={() => toggleSystem(sys.value)}
                      className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      {sys.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Specific Concerns */}
        {wizard.currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Specific Concerns (Optional)</h2>
            <p className="text-sm text-muted-foreground">
              Select any specific compliance concerns to get targeted guidance.
            </p>

            <div className="grid sm:grid-cols-2 gap-2">
              {PCI_COMPLIANCE_CONCERNS.map((concern) => {
                const selected = concerns.includes(concern.value);
                return (
                  <button
                    key={concern.value}
                    type="button"
                    onClick={() => toggleConcern(concern.value)}
                    className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    {concern.label}
                  </button>
                );
              })}
            </div>

            <div>
              <Label className="mb-2 block">Additional Context</Label>
              <Textarea
                placeholder="Describe any specific scenarios, upcoming assessments, recent breaches, or situations you need guidance on..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {wizard.currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your PCI DSS Compliance Assessment</h2>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
                {error}
              </div>
            )}

            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing PCI DSS compliance requirements...
              </div>
            )}

            {streamedText && (
              <Card>
                <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(streamedText) }} />
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
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {wizard.currentStep < 4 && (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {wizard.currentStep === 3 ? "Run Assessment" : "Next"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {wizard.currentStep === 4 && !isStreaming && streamedText && (
            <Button
              variant="outline"
              onClick={() => {
                wizard.reset();
                setStreamedText("");
                setDomain("");
                setJurisdictions([]);
                setSaqType("");
                setMerchantLevel("");
                setSystemsUsed([]);
                setConcerns([]);
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
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-2"><span class="text-green-500">&#9745;</span>$1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-2"><span class="text-muted-foreground">&#9744;</span>$1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}
