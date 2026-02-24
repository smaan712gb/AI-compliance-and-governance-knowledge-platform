"use client";

import { useState, useRef } from "react";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { REPORT_TYPES, FOCUS_AREAS, BOARD_AUDIENCES } from "@/lib/constants/board-report-data";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function BoardReportWizardPage() {
  const wizard = useWizardState({ totalSteps: 4 });

  const [reportType, setReportType] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [audience, setAudience] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleFocus = (value: string) => {
    setFocusAreas((prev) => prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]);
  };

  const canProceed = () => {
    switch (wizard.currentStep) {
      case 0: return !!reportType;
      case 1: return !!periodStart && !!periodEnd && focusAreas.length > 0;
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
      const res = await fetch("/api/ai/board-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType, periodStart, periodEnd, focusAreas,
          audience: audience || undefined,
          additionalContext: additionalContext || undefined,
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
        <h1 className="text-2xl font-bold mb-2">Board Report Generator</h1>
        <p className="text-muted-foreground mb-6">Generate board-ready cybersecurity and compliance reports.</p>
        <Progress value={wizard.progress} className="mb-8" />

        {wizard.currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Report Type</h2>
            <div className="grid gap-3">
              {REPORT_TYPES.map((rt) => {
                const selected = reportType === rt.value;
                return (
                  <Card key={rt.value} className={`cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                    onClick={() => setReportType(rt.value)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      {selected && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                      <div>
                        <h3 className="font-medium">{rt.label}</h3>
                        <p className="text-sm text-muted-foreground">{rt.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {wizard.currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Reporting Period & Focus Areas</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="mb-2 block">Period Start <span className="text-destructive">*</span></Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Period End <span className="text-destructive">*</span></Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Focus Areas <span className="text-destructive">*</span></Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {FOCUS_AREAS.map((fa) => {
                  const selected = focusAreas.includes(fa.value);
                  return (
                    <button key={fa.value} type="button" onClick={() => toggleFocus(fa.value)}
                      className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${selected ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"}`}>
                      {fa.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Audience & Context (Optional)</h2>
            <div>
              <Label className="mb-2 block">Audience</Label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select audience...</option>
                {BOARD_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-2 block">Additional Context</Label>
              <Textarea placeholder="Any specific topics, recent incidents, or strategic priorities to highlight..."
                value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} rows={4} />
            </div>
          </div>
        )}

        {wizard.currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Board Report</h2>
            {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}
            {isStreaming && !streamedText && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4"><Loader2 className="h-4 w-4 animate-spin" /> Generating board report...</div>
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
          {wizard.currentStep < 3 && <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">{wizard.currentStep === 2 ? "Generate Report" : "Next"} <ArrowRight className="h-4 w-4" /></Button>}
          {wizard.currentStep === 3 && !isStreaming && streamedText && (
            <Button variant="outline" onClick={() => { wizard.reset(); setStreamedText(""); setReportType(""); setFocusAreas([]); setError(null); }}>Start Over</Button>
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
    .replace(/^- (.+)$/gm, "<li>$1</li>").replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
}
