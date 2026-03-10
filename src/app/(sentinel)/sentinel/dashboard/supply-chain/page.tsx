"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2,
  ShieldAlert, TrendingUp, Globe, Bell, ArrowUpRight, Clock,
  RefreshCw, Package, MapPin,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Supplier {
  id: string;
  name: string;
  countryCode: string;
  sector: string;
  tier: number;
  criticality: string;
  currentRiskScore: number;
  riskLevel: string;
  lastAssessedAt: string | null;
  shippingRoutes: string[];
  dependsOnCountries: string[];
}

interface SupplyChainAlert {
  id: string;
  alertType: string;
  previousRiskScore: number;
  newRiskScore: number;
  riskChange: number;
  impactSummary: string;
  mitigations: { type: string; description: string; urgency: string }[];
  isRead: boolean;
  createdAt: string;
  supplier: { name: string; countryCode: string };
  event: { headline: string; severity: string; category: string };
}

interface PortfolioData {
  totalSuppliers: number;
  riskBreakdown: Record<string, number>;
  singlePointsOfFailure: string[];
  highRiskCountries: string[];
  recommendations: string[];
  concentrationRisks: { type: string; value: string; supplierCount: number; percentageOfTotal: number; riskLevel: string }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

function riskColor(score: number) {
  if (score >= 70) return "text-red-500";
  if (score >= 50) return "text-orange-500";
  if (score >= 30) return "text-amber-500";
  return "text-green-500";
}

const ROUTE_LABELS: Record<string, string> = {
  hormuz: "Strait of Hormuz",
  suez: "Suez Canal",
  malacca: "Strait of Malacca",
  bosporus: "Bosphorus",
  panama: "Panama Canal",
  babel_mandeb: "Bab el-Mandeb",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SupplyChainPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [alerts, setAlerts] = useState<SupplyChainAlert[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [stats, setStats] = useState<{ total: number; riskBreakdown: Record<string, number>; unreadAlerts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Add supplier form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", countryCode: "", sector: "", tier: 1, criticality: "medium", description: "", shippingRoutes: [] as string[], dependsOnCountries: "" });
  const [adding, setAdding] = useState(false);

  // Fetch org ID first
  useEffect(() => {
    fetch("/api/sentinel/organizations")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.length > 0) {
          setOrgId(d.data[0].id);
        } else {
          // No org found — stop loading so the page doesn't spin forever
          setLoading(false);
          setError("No Sentinel organization found. Please create one first.");
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Failed to load organizations");
      });
  }, []);

  const fetchData = useCallback(async (manual = false) => {
    if (!orgId) return;
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sentinel/supply-chain?organizationId=${orgId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuppliers(data.data.suppliers || []);
      setAlerts(data.data.recentAlerts || []);
      setPortfolio(data.data.portfolio || null);
      setStats(data.data.stats || null);
    } catch {
      setError("Failed to load supply chain data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId, fetchData]);

  async function handleAddSupplier() {
    if (!orgId || !addForm.name.trim() || !addForm.countryCode.trim() || !addForm.sector.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/sentinel/supply-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          countryCode: addForm.countryCode.toUpperCase(),
          organizationId: orgId,
          dependsOnCountries: addForm.dependsOnCountries ? addForm.dependsOnCountries.split(",").map((c) => c.trim().toUpperCase()) : [],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to add supplier");
        return;
      }
      setShowAddForm(false);
      setAddForm({ name: "", countryCode: "", sector: "", tier: 1, criticality: "medium", description: "", shippingRoutes: [], dependsOnCountries: "" });
      fetchData(true);
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/sentinel/supply-chain?id=${id}`, { method: "DELETE" });
      fetchData(true);
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading supply chain intelligence...</span>
      </div>
    );
  }

  const criticalSuppliers = suppliers.filter((s) => s.riskLevel === "critical");
  const unreadAlerts = alerts.filter((a) => !a.isRead);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-500" />
            Supply Chain Intelligence
          </h1>
          <p className="text-muted-foreground">
            Live supplier risk monitoring with AI-powered impact assessments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Register Supplier
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <Package className="h-5 w-5 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold font-mono">{stats?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Suppliers Tracked</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
          <p className="text-2xl font-bold font-mono">{criticalSuppliers.length}</p>
          <p className="text-xs text-muted-foreground">Critical Risk</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-orange-50 dark:bg-orange-950/30">
          <ShieldAlert className="h-5 w-5 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold font-mono">{stats?.riskBreakdown?.high ?? 0}</p>
          <p className="text-xs text-muted-foreground">High Risk</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <Bell className="h-5 w-5 mx-auto mb-2 text-amber-500" />
          <p className="text-2xl font-bold font-mono">{unreadAlerts.length}</p>
          <p className="text-xs text-muted-foreground">Active Alerts</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <Globe className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
          <p className="text-2xl font-bold font-mono">{new Set(suppliers.map((s) => s.countryCode)).size}</p>
          <p className="text-xs text-muted-foreground">Countries</p>
        </div>
      </div>

      {/* Portfolio Recommendations */}
      {portfolio && portfolio.recommendations.length > 0 && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            AI Portfolio Recommendations
          </h3>
          <ul className="space-y-2">
            {portfolio.recommendations.map((rec, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                {rec}
              </li>
            ))}
          </ul>
          {portfolio.singlePointsOfFailure.length > 0 && (
            <div className="mt-3 rounded-md bg-red-100 dark:bg-red-900/30 p-3">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Single Points of Failure: {portfolio.singlePointsOfFailure.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Impact Alerts Feed */}
      {alerts.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              Supply Chain Impact Alerts
              {unreadAlerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                  {unreadAlerts.length} new
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className={`p-4 ${!alert.isRead ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[alert.newRiskScore >= 70 ? "critical" : alert.newRiskScore >= 50 ? "high" : "medium"]}`}>
                        {alert.supplier.countryCode}
                      </span>
                      <span className="text-xs font-bold font-mono flex items-center gap-1 text-red-500">
                        <ArrowUpRight className="h-3 w-3" />
                        {alert.previousRiskScore} → {alert.newRiskScore} (+{alert.riskChange})
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                        {alert.alertType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{alert.supplier.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.impactSummary}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Triggered by: {alert.event.headline}
                    </p>
                    {alert.mitigations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(alert.mitigations as { type: string; description: string; urgency: string }[]).slice(0, 2).map((m, i) => (
                          <p key={i} className="text-xs flex items-start gap-1.5">
                            <ShieldAlert className={`h-3 w-3 flex-shrink-0 mt-0.5 ${m.urgency === "urgent" ? "text-red-500" : "text-amber-500"}`} />
                            {m.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Registry */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Registered Suppliers
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>

        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Suppliers Registered</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Register your suppliers to get automatic risk re-scoring when geopolitical events
              hit their countries, shipping routes, or sectors. AI-powered impact alerts delivered
              instantly.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Register Your First Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Country</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Sector</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Risk Score</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Level</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Routes</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Last Assessed</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Tier {s.tier} · {s.criticality}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.countryCode}</td>
                    <td className="px-4 py-3 text-xs">{s.sector}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg font-bold font-mono ${riskColor(s.currentRiskScore)}`}>
                        {s.currentRiskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${RISK_COLORS[s.riskLevel]}`}>
                        {s.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.shippingRoutes.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {s.shippingRoutes.map((r) => (
                            <span key={r} className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              {ROUTE_LABELS[r] || r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.lastAssessedAt ? new Date(s.lastAssessedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Concentration Risks */}
      {portfolio && portfolio.concentrationRisks.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-red-500" />
            Concentration Risks
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            {portfolio.concentrationRisks.map((cr, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{cr.type}: {cr.value}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[cr.riskLevel]}`}>
                    {cr.percentageOfTotal}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {cr.supplierCount} suppliers concentrated
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Register Supplier</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Supplier Name *</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g., ACME Components Ltd" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Country Code *</label>
                  <input type="text" value={addForm.countryCode} onChange={(e) => setAddForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="SA" maxLength={5} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Sector *</label>
                  <input type="text" value={addForm.sector} onChange={(e) => setAddForm((p) => ({ ...p, sector: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Oil & Gas" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tier</label>
                  <select value={addForm.tier} onChange={(e) => setAddForm((p) => ({ ...p, tier: Number(e.target.value) }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value={1}>Tier 1 (Direct)</option>
                    <option value={2}>Tier 2 (Sub-tier)</option>
                    <option value={3}>Tier 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Criticality</label>
                  <select value={addForm.criticality} onChange={(e) => setAddForm((p) => ({ ...p, criticality: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Shipping Routes</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROUTE_LABELS).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={addForm.shippingRoutes.includes(key)}
                        onChange={(e) => {
                          setAddForm((p) => ({
                            ...p,
                            shippingRoutes: e.target.checked
                              ? [...p.shippingRoutes, key]
                              : p.shippingRoutes.filter((r) => r !== key),
                          }));
                        }}
                        className="accent-blue-600" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Upstream Countries (comma-separated ISO codes)</label>
                <input type="text" value={addForm.dependsOnCountries} onChange={(e) => setAddForm((p) => ({ ...p, dependsOnCountries: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="CN, TW, KR" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input type="text" value={addForm.description} onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Critical oil supplier, 40% of our crude imports" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowAddForm(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleAddSupplier} disabled={adding || !addForm.name.trim() || !addForm.countryCode.trim() || !addForm.sector.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register & Assess"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
