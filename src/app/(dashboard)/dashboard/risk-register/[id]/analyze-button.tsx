"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function RiskAnalyzeButton({ riskId, hasAssessments }: { riskId: string; hasAssessments: boolean }) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true); setError(null);
    try {
      const res = await fetch("/api/ai/risk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || `Status ${res.status}`); }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally { setIsAnalyzing(false); }
  };

  return (
    <div>
      <Button onClick={handleAnalyze} disabled={isAnalyzing} variant={hasAssessments ? "outline" : "default"} className="gap-2">
        {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> {hasAssessments ? "Re-Analyze" : "Analyze Risk"}</>}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
