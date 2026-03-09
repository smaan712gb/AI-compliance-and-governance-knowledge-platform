"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, Search, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreeningResult {
  entityName: string;
  entityType: string;
  compositeScore: number;
  recommendation: string;
  sanctionsScore: number;
  pepScore: number;
  adverseMediaScore: number;
  geographicRiskScore: number;
  riskFactors: string[];
  sanctionsMatches: { matchedName: string; listName: string; score: number }[];
  screenedAt: string;
}

interface HistoricalResult {
  id: string;
  entityName: string;
  entityType: string;
  compositeScore: number;
  recommendation: string;
  createdAt: string;
}

const REC_STYLES: Record<string, { class: string; icon: typeof CheckCircle2 }> = {
  block: { class: "bg-red-100 text-red-800", icon: XCircle },
  enhanced_due_diligence: { class: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  standard: { class: "bg-blue-100 text-blue-800", icon: Search },
  clear: { class: "bg-green-100 text-green-800", icon: CheckCircle2 },
  BLOCK: { class: "bg-red-100 text-red-800", icon: XCircle },
  ENHANCED_DUE_DILIGENCE: { class: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  STANDARD: { class: "bg-blue-100 text-blue-800", icon: Search },
  CLEAR: { class: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

export default function ScreeningPage() {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<string>("person");
  const [countryCode, setCountryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [history, setHistory] = useState<HistoricalResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sentinel/screening?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setHistory(data.data);
      })
      .catch(() => {});
  }, []);

  async function handleScreen() {
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sentinel/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          entityType,
          countryCode: countryCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Screening failed");
        return;
      }

      setResult(data.data);

      // Refresh history
      fetch("/api/sentinel/screening?limit=10")
        .then((r) => r.json())
        .then((d) => { if (d?.data) setHistory(d.data); })
        .catch(() => {});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entity Screening</h1>
        <p className="text-muted-foreground">
          Screen entities against sanctions, PEP, and adverse media databases
        </p>
      </div>

      {/* Screening Form */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Entity Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith or Acme Corporation"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="person">Person</option>
              <option value="organization">Organization</option>
              <option value="vessel">Vessel</option>
              <option value="aircraft">Aircraft</option>
            </select>
          </div>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium mb-1">
            Country (ISO-2)
          </label>
          <input
            type="text"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="e.g. RU"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={5}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleScreen}
          disabled={loading || !name.trim()}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Screen Entity
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{result.entityName}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {result.entityType}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">
                {result.compositeScore}
              </div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  REC_STYLES[result.recommendation]?.class || ""
                }`}
              >
                {result.recommendation.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sanctions", score: result.sanctionsScore, color: "red" },
              { label: "PEP", score: result.pepScore, color: "purple" },
              { label: "Adverse Media", score: result.adverseMediaScore, color: "amber" },
              { label: "Geographic", score: result.geographicRiskScore, color: "blue" },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-muted/50 p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-xl font-bold font-mono">{item.score}</div>
              </div>
            ))}
          </div>

          {/* Risk Factors */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Risk Factors</h4>
            <ul className="space-y-1">
              {result.riskFactors.map((f, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Sanctions Matches */}
          {result.sanctionsMatches.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Sanctions Matches</h4>
              <div className="space-y-2">
                {result.sanctionsMatches.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950 p-3">
                    <div>
                      <p className="text-sm font-medium">{m.matchedName}</p>
                      <p className="text-xs text-muted-foreground">{m.listName}</p>
                    </div>
                    <span className="text-sm font-bold font-mono">{m.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-5 border-b">
            <h3 className="font-semibold">Recent Screenings</h3>
          </div>
          <div className="divide-y">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{h.entityName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {h.entityType} · {new Date(h.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold font-mono">{h.compositeScore}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      REC_STYLES[h.recommendation]?.class || ""
                    }`}
                  >
                    {h.recommendation.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
