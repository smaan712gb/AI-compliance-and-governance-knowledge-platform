"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { INCIDENT_TYPES, DATA_TYPES_INVOLVED } from "@/lib/constants/incident-data";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/constants/company-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function IncidentAssessmentWizardPage() {
  const wizard = useWizardState({ totalSteps: 5 });

  const [incidentType, setIncidentType] = useState("");
  const [description, setDescription] = useState("");
  const [recordsAffected, setRecordsAffected] = useState("");
  const [dataTypesInvolved, setDataTypesInvolved] = useState<string[]>([]);
  const [discoveryDate, setDiscoveryDate] = useState("");
  const [containmentDate, setContainmentDate] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [isPublicCompany, setIsPublicCompany] = useState(false);

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleDataType = (value: string) => {
    setDataTypesInvolved((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0: return !!incidentType;
      case 1: return description.trim().length >= 20;
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
      const res = await fetch("/api/ai/incident-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentType,
          description,
          recordsAffected: recordsAffected ? parseInt(recordsAffected) : undefined,
          dataTypesInvolved: dataTypesInvolved.length > 0 ? dataTypesInvolved : undefined,
          discoveryDate: discoveryDate || undefined,
          containmentDate: containmentDate || undefined,
          industry: industry || undefined,
          companySize: companySize || undefined,
          isPublicCompany,
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
        <h1 className="text-2xl font-bold mb-2">Incident Materiality Assessment</h1>
        <p className="text-muted-foreground mb-6">
          Assess cybersecurity incident materiality under SEC, GDPR, HIPAA, and state breach laws.
        </p>
        <Progress value={wizard.progress} className="mb-8" />

        {/* Step 0: Incident Type */}
        {wizard.currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Incident Type</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {INCIDENT_TYPES.map((type) => {
                const selected = incidentType === type.value;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                    onClick={() => setIncidentType(type.value)}
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
          </div>
        )}

        {/* Step 1: Impact Details */}
        {wizard.currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Incident Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description" className="mb-2 block">Description <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  placeholder="Describe what happened, how it was discovered, and the current status..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="records" className="mb-2 block">Records Affected (estimated)</Label>
                <Input
                  id="records"
                  type="number"
                  placeholder="e.g., 50000"
                  value={recordsAffected}
                  onChange={(e) => setRecordsAffected(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">Data Types Involved</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DATA_TYPES_INVOLVED.map((dt) => {
                    const selected = dataTypesInvolved.includes(dt.value);
                    return (
                      <button
                        key={dt.value}
                        type="button"
                        onClick={() => toggleDataType(dt.value)}
                        className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                          selected ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"
                        }`}
                      >
                        {dt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Timeline */}
        {wizard.currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Incident Timeline</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="discoveryDate" className="mb-2 block">Discovery Date</Label>
                <Input
                  id="discoveryDate"
                  type="date"
                  value={discoveryDate}
                  onChange={(e) => setDiscoveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="containmentDate" className="mb-2 block">Containment Date (if contained)</Label>
                <Input
                  id="containmentDate"
                  type="date"
                  value={containmentDate}
                  onChange={(e) => setContainmentDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Organization Context */}
        {wizard.currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Organization Context</h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Industry</Label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>{ind.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Company Size</Label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select size...</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublicCompany"
                  checked={isPublicCompany}
                  onChange={(e) => setIsPublicCompany(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isPublicCompany">This is a publicly traded company (SEC reporting)</Label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {wizard.currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Materiality Assessment Results</h2>
            {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}
            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing incident materiality...
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
          {wizard.currentStep < 4 && (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {wizard.currentStep === 3 ? "Run Assessment" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {wizard.currentStep === 4 && !isStreaming && streamedText && (
            <Button variant="outline" onClick={() => { wizard.reset(); setStreamedText(""); setIncidentType(""); setDescription(""); setError(null); }}>
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
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2"><input type="checkbox" disabled /> $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2"><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>").replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
}
