"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LEGAL_BASES, DATA_CATEGORIES, DATA_SUBJECT_TYPES, TRANSFER_MECHANISMS } from "@/lib/constants/privacy-ops-data";
import { INDUSTRIES } from "@/lib/constants/company-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function ROPAWizardPage() {
  const wizard = useWizardState({ totalSteps: 4 });

  const [activityName, setActivityName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [dataSubjectTypes, setDataSubjectTypes] = useState<string[]>([]);
  const [recipients, setRecipients] = useState("");
  const [transferMechanisms, setTransferMechanisms] = useState<string[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [industry, setIndustry] = useState("");

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleItem = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0: return activityName.trim().length > 0 && purpose.trim().length >= 10 && !!legalBasis;
      case 1: return dataCategories.length > 0 && dataSubjectTypes.length > 0;
      case 2: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (wizard.currentStep === 2) { wizard.next(); runAnalysis(); }
    else wizard.next();
  };

  const runAnalysis = async () => {
    setIsStreaming(true); setStreamedText(""); setError(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/ropa-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityName, purpose, legalBasis,
          dataCategories, dataSubjectTypes,
          recipients: recipients ? recipients.split(",").map((r) => r.trim()) : undefined,
          transferMechanisms: transferMechanisms.length > 0 ? transferMechanisms : undefined,
          retentionPeriod: retentionPeriod || undefined,
          industry: industry || undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error?.message || `Status ${res.status}`); }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6); if (data === "[DONE]") continue;
            try { const p = JSON.parse(data); if (p.text) setStreamedText((prev) => prev + p.text); if (p.error) setError(p.error); } catch {}
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally { setIsStreaming(false); }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">ROPA Generator</h1>
        <p className="text-muted-foreground mb-6">Build Article 30 Records of Processing Activities with DPIA assessment.</p>
        <Progress value={wizard.progress} className="mb-8" />

        {wizard.currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Processing Activity Details</h2>
            <div>
              <Label className="mb-2 block">Activity Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Customer onboarding, Marketing emails..." value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Purpose of Processing <span className="text-destructive">*</span></Label>
              <Textarea placeholder="Describe the purpose of processing..." value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">Legal Basis <span className="text-destructive">*</span></Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {LEGAL_BASES.map((lb) => (
                  <Card key={lb.value} className={`cursor-pointer p-3 ${legalBasis === lb.value ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setLegalBasis(lb.value)}>
                    <div className="flex items-center gap-2">
                      {legalBasis === lb.value && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                      <div><p className="text-sm font-medium">{lb.label}</p><p className="text-xs text-muted-foreground">{lb.description}</p></div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {wizard.currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Data Categories <span className="text-destructive">*</span></h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {DATA_CATEGORIES.map((dc) => (
                  <button key={dc.value} type="button" onClick={() => toggleItem(dataCategories, setDataCategories, dc.value)}
                    className={`text-left text-sm px-3 py-2 rounded-md border ${dataCategories.includes(dc.value) ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"}`}>
                    {dc.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Data Subject Types <span className="text-destructive">*</span></h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {DATA_SUBJECT_TYPES.map((ds) => (
                  <button key={ds.value} type="button" onClick={() => toggleItem(dataSubjectTypes, setDataSubjectTypes, ds.value)}
                    className={`text-left text-sm px-3 py-2 rounded-md border ${dataSubjectTypes.includes(ds.value) ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"}`}>
                    {ds.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Additional Details (Optional)</h2>
            <div>
              <Label className="mb-2 block">Recipients (comma-separated)</Label>
              <Input placeholder="e.g., Payment processor, Cloud hosting provider..." value={recipients} onChange={(e) => setRecipients(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Transfer Mechanisms</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {TRANSFER_MECHANISMS.map((tm) => (
                  <button key={tm.value} type="button" onClick={() => toggleItem(transferMechanisms, setTransferMechanisms, tm.value)}
                    className={`text-left text-sm px-3 py-2 rounded-md border ${transferMechanisms.includes(tm.value) ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"}`}>
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Retention Period</Label>
              <Input placeholder="e.g., 3 years after contract end..." value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Industry</Label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select...</option>
                {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value}>{ind.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {wizard.currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your ROPA Entry</h2>
            {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}
            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4"><Loader2 className="h-4 w-4 animate-spin" /> Generating ROPA entry...</div>
            )}
            {streamedText && (
              <Card><CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(streamedText) }} />
                {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
              </CardContent></Card>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={wizard.previous} disabled={wizard.isFirst || isStreaming} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
          {wizard.currentStep < 3 && <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">{wizard.currentStep === 2 ? "Generate ROPA" : "Next"} <ArrowRight className="h-4 w-4" /></Button>}
          {wizard.currentStep === 3 && !isStreaming && streamedText && (
            <Button variant="outline" onClick={() => { wizard.reset(); setStreamedText(""); setActivityName(""); setPurpose(""); setError(null); }}>Start Over</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>").replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
}
