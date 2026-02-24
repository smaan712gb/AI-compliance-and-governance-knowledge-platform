"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JURISDICTIONS } from "@/lib/constants/privacy-ops-data";
import { Loader2, Scale } from "lucide-react";

export default function DPAReviewPage() {
  const [dpaText, setDpaText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [concerns, setConcerns] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runReview = async () => {
    setIsStreaming(true); setStreamedText(""); setError(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/dpa-review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dpaText,
          jurisdiction: jurisdiction || undefined,
          concerns: concerns || undefined,
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
        <div className="flex items-center gap-3 mb-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">DPA Review</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Paste your Data Processing Agreement for a clause-by-clause compliance review against GDPR Art 28(3).
        </p>

        {!streamedText && !isStreaming && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dpaText" className="mb-2 block">
                DPA Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dpaText"
                placeholder="Paste the full Data Processing Agreement text here..."
                value={dpaText}
                onChange={(e) => setDpaText(e.target.value)}
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters. Up to 8,000 characters analyzed.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Jurisdiction</Label>
                <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {JURISDICTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Specific Concerns</Label>
                <Textarea placeholder="Any areas of concern..." value={concerns} onChange={(e) => setConcerns(e.target.value)} rows={2} />
              </div>
            </div>
            <Button onClick={runReview} disabled={dpaText.length < 50} className="w-full">
              Review DPA
            </Button>
          </div>
        )}

        {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}

        {isStreaming && !streamedText && (
          <div className="flex items-center gap-2 text-muted-foreground mb-4"><Loader2 className="h-4 w-4 animate-spin" /> Reviewing DPA clauses...</div>
        )}

        {streamedText && (
          <>
            <Card>
              <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(streamedText) }} />
                {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
              </CardContent>
            </Card>
            {!isStreaming && (
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => { setStreamedText(""); setDpaText(""); setError(null); }}>
                  Review Another DPA
                </Button>
              </div>
            )}
          </>
        )}
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
