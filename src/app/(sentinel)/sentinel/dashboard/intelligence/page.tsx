"use client";

import { useState } from "react";
import { Brain, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReasoningResult {
  reasoning: {
    category: string;
    severity: string;
    riskScore: number;
    reasoning: {
      whatHappened: string;
      whyItMatters: string;
      whatHappensNext: string;
      whoIsAffected: string;
    };
    impactAnalysis: {
      primaryImpact: string;
      secondOrderEffects: string[];
      affectedSectors: string[];
      affectedCountries: string[];
    };
    actionableInsights: string[];
    entities: string[];
    reasoningTokens: number;
  };
  biasAudit: {
    hasBias: boolean;
    confidence: number;
    biasType: string | null;
    explanation: string;
    recommendation: string;
  } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function IntelligencePage() {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [includeBias, setIncludeBias] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReasoningResult | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!headline.trim() || !content.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sentinel/reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim(),
          content: content.trim(),
          source: source.trim() || undefined,
          countryCode: countryCode.trim() || undefined,
          includeBiasAudit: includeBias,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      setResult(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intelligence Analysis</h1>
        <p className="text-muted-foreground">
          Submit events for AI-powered reasoning and impact assessment
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Headline *</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Russia deploys additional naval assets to Black Sea"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the full article or event description..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[120px]"
            maxLength={10000}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Reuters"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Country Code (ISO-2)
            </label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="e.g. UA"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={5}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeBias"
            checked={includeBias}
            onChange={(e) => setIncludeBias(e.target.checked)}
            className="accent-emerald-600"
          />
          <label htmlFor="includeBias" className="text-sm">
            Include bias audit (Pro+ only)
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={loading || !headline.trim() || !content.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analyze Event
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    SEVERITY_COLORS[result.reasoning.severity] || ""
                  }`}
                >
                  {result.reasoning.severity.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {result.reasoning.category}
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono">
                  {result.reasoning.riskScore}
                </div>
                <div className="text-xs text-muted-foreground">Risk Score</div>
              </div>
            </div>

            {/* Reasoning Chain */}
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "What Happened", text: result.reasoning.reasoning.whatHappened },
                { label: "Why It Matters", text: result.reasoning.reasoning.whyItMatters },
                { label: "What Happens Next", text: result.reasoning.reasoning.whatHappensNext },
                { label: "Who Is Affected", text: result.reasoning.reasoning.whoIsAffected },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-muted/50 p-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    {item.label}
                  </h4>
                  <p className="text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Impact Analysis</h3>
            <p className="text-sm mb-4">
              <strong>Primary:</strong> {result.reasoning.impactAnalysis.primaryImpact}
            </p>

            {result.reasoning.impactAnalysis.secondOrderEffects.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Second-Order Effects
                </h4>
                <ul className="space-y-1">
                  {result.reasoning.impactAnalysis.secondOrderEffects.map((e, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Affected Sectors
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.reasoning.impactAnalysis.affectedSectors.map((s) => (
                    <span key={s} className="text-xs bg-muted px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Affected Countries
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.reasoning.impactAnalysis.affectedCountries.map((c) => (
                    <span key={c} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Insights */}
          {result.reasoning.actionableInsights.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-3">Actionable Insights</h3>
              <ul className="space-y-2">
                {result.reasoning.actionableInsights.map((insight, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bias Audit */}
          {result.biasAudit && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-3">Bias Audit</h3>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    result.biasAudit.hasBias
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {result.biasAudit.recommendation.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  Confidence: {Math.round(result.biasAudit.confidence * 100)}%
                </span>
                {result.biasAudit.biasType && (
                  <span className="text-sm text-muted-foreground">
                    Type: {result.biasAudit.biasType}
                  </span>
                )}
              </div>
              <p className="text-sm">{result.biasAudit.explanation}</p>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-muted-foreground text-right">
            {result.reasoning.reasoningTokens} tokens used ·{" "}
            {result.reasoning.entities.length} entities extracted
          </div>
        </div>
      )}
    </div>
  );
}
