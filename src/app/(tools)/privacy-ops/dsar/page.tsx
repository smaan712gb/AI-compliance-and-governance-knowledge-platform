"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DSAR_TYPES, DATA_SUBJECT_TYPES, JURISDICTIONS } from "@/lib/constants/privacy-ops-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function DSARWizardPage() {
  const wizard = useWizardState({ totalSteps: 3 });

  const [dsarType, setDsarType] = useState("");
  const [dataSubjectType, setDataSubjectType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [companyContext, setCompanyContext] = useState("");

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0: return !!dsarType;
      case 1: return requestDetails.trim().length >= 10;
      default: return false;
    }
  };

  const handleNext = () => {
    if (wizard.currentStep === 1) {
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
      const res = await fetch("/api/ai/dsar-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dsarType,
          dataSubjectType: dataSubjectType || undefined,
          jurisdiction: jurisdiction || undefined,
          requestDetails,
          companyContext: companyContext || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Request failed with status ${res.status}`);
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
              if (parsed.text) setStreamedText((prev) => prev + parsed.text);
              if (parsed.error) setError(parsed.error);
            } catch { /* skip */ }
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
        <h1 className="text-2xl font-bold mb-2">DSAR Response Generator</h1>
        <p className="text-muted-foreground mb-6">
          Generate compliant Data Subject Access Request responses with draft letters and compliance checklists.
        </p>
        <Progress value={wizard.progress} className="mb-8" />

        {/* Step 0: DSAR Type */}
        {wizard.currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Request Type</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {DSAR_TYPES.map((type) => {
                const selected = dsarType === type.value;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                    onClick={() => setDsarType(type.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{type.label}</h3>
                        {selected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Data Subject Type</Label>
                <select
                  value={dataSubjectType}
                  onChange={(e) => setDataSubjectType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type...</option>
                  {DATA_SUBJECT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Jurisdiction</Label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select jurisdiction...</option>
                  {JURISDICTIONS.map((j) => (
                    <option key={j.value} value={j.value}>{j.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Request Details */}
        {wizard.currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Request Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="requestDetails" className="mb-2 block">
                  Describe the request <span className="text-muted-foreground">(required)</span>
                </Label>
                <Textarea
                  id="requestDetails"
                  placeholder="Describe the DSAR request, including what the data subject is asking for, any specific data they mentioned, and relevant context..."
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="companyContext" className="mb-2 block">
                  Company Context <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="companyContext"
                  placeholder="What systems/databases hold this person's data? Any relevant processing activities..."
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {wizard.currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your DSAR Response</h2>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>
            )}
            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating compliant DSAR response...
              </div>
            )}
            {streamedText && (
              <Card>
                <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(streamedText) }} />
                  {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={wizard.previous} disabled={wizard.isFirst || isStreaming} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {wizard.currentStep < 2 && (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {wizard.currentStep === 1 ? "Generate Response" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {wizard.currentStep === 2 && !isStreaming && streamedText && (
            <Button variant="outline" onClick={() => { wizard.reset(); setStreamedText(""); setDsarType(""); setRequestDetails(""); setError(null); }}>
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
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
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
    .replace(/\n/g, "<br/>");
}
