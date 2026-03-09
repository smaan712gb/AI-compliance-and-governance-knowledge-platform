"use client";

import { useState } from "react";
import { Truck, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupplierInput {
  name: string;
  countryCode: string;
  tier: number;
  criticality: string;
  sector: string;
}

interface RiskAssessment {
  supplierName: string;
  countryCode: string;
  compositeRisk: number;
  riskLevel: string;
  countryRiskScore: number;
  proximityRisk: number;
  cascadeRisk: number;
  mitigations: { type: string; description: string; estimatedCostReduction: number; implementationTime: string }[];
}

interface PortfolioResult {
  portfolio: {
    totalSuppliers: number;
    riskBreakdown: Record<string, number>;
    singlePointsOfFailure: string[];
    highRiskCountries: string[];
    recommendations: string[];
    concentrationRisks: { type: string; value: string; percentageOfTotal: number; riskLevel: string }[];
  };
  assessments: RiskAssessment[];
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const emptySupplier: SupplierInput = {
  name: "",
  countryCode: "",
  tier: 1,
  criticality: "medium",
  sector: "",
};

export default function SupplyChainPage() {
  const [suppliers, setSuppliers] = useState<SupplierInput[]>([{ ...emptySupplier }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [error, setError] = useState("");

  function updateSupplier(index: number, field: keyof SupplierInput, value: string | number) {
    setSuppliers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addSupplier() {
    setSuppliers((prev) => [...prev, { ...emptySupplier }]);
  }

  function removeSupplier(index: number) {
    setSuppliers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    const valid = suppliers.filter((s) => s.name.trim() && s.countryCode.trim() && s.sector.trim());
    if (valid.length === 0) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sentinel/supply-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suppliers: valid,
          mode: valid.length > 1 ? "portfolio" : "single",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      if (data.data.portfolio) {
        setResult(data.data);
      } else {
        // Single assessment — wrap in portfolio format
        setResult({
          portfolio: {
            totalSuppliers: 1,
            riskBreakdown: { [data.data.riskLevel]: 1 },
            singlePointsOfFailure: [],
            highRiskCountries: [],
            recommendations: [],
            concentrationRisks: [],
          },
          assessments: [data.data],
        });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supply Chain Risk Analysis</h1>
        <p className="text-muted-foreground">
          Assess geopolitical risk exposure for your suppliers (Expert+ tier)
        </p>
      </div>

      {/* Supplier Input Form */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Suppliers</h3>
        {suppliers.map((s, i) => (
          <div key={i} className="grid grid-cols-6 gap-3 items-end">
            <div className="col-span-2">
              {i === 0 && <label className="block text-xs font-medium mb-1">Name</label>}
              <input
                type="text"
                value={s.name}
                onChange={(e) => updateSupplier(i, "name", e.target.value)}
                placeholder="Supplier name"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              {i === 0 && <label className="block text-xs font-medium mb-1">Country</label>}
              <input
                type="text"
                value={s.countryCode}
                onChange={(e) => updateSupplier(i, "countryCode", e.target.value.toUpperCase())}
                placeholder="ISO-2"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                maxLength={5}
              />
            </div>
            <div>
              {i === 0 && <label className="block text-xs font-medium mb-1">Criticality</label>}
              <select
                value={s.criticality}
                onChange={(e) => updateSupplier(i, "criticality", e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              {i === 0 && <label className="block text-xs font-medium mb-1">Sector</label>}
              <input
                type="text"
                value={s.sector}
                onChange={(e) => updateSupplier(i, "sector", e.target.value)}
                placeholder="Sector"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              {suppliers.length > 1 && (
                <button
                  onClick={() => removeSupplier(i)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={addSupplier}>
            <Plus className="mr-1 h-3 w-3" /> Add Supplier
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={loading || suppliers.every((s) => !s.name.trim())}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Truck className="mr-2 h-4 w-4" />
                Analyze Risk
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Portfolio Summary */}
          {result.portfolio.totalSuppliers > 1 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Portfolio Summary</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {Object.entries(result.portfolio.riskBreakdown).map(([level, count]) => (
                  <div key={level} className="text-center rounded-md bg-muted/50 p-3">
                    <div className="text-2xl font-bold">{count}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${RISK_COLORS[level] || ""}`}>
                      {level.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              {result.portfolio.recommendations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {result.portfolio.recommendations.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.portfolio.singlePointsOfFailure.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                    Single Points of Failure
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {result.portfolio.singlePointsOfFailure.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Individual Assessments */}
          <div className="space-y-4">
            {result.assessments.map((a, i) => (
              <div key={i} className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{a.supplierName}</h3>
                    <span className="text-xs text-muted-foreground">{a.countryCode}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono">{a.compositeRisk}</div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[a.riskLevel] || ""}`}>
                      {a.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Country Risk", value: a.countryRiskScore },
                    { label: "Proximity", value: a.proximityRisk },
                    { label: "Cascade", value: a.cascadeRisk },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md bg-muted/50 p-2 text-center">
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="text-lg font-bold font-mono">{item.value}</div>
                    </div>
                  ))}
                </div>

                {a.mitigations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                      Mitigation Options
                    </h4>
                    <div className="space-y-2">
                      {a.mitigations.map((m, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span>{m.description}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({m.implementationTime})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
