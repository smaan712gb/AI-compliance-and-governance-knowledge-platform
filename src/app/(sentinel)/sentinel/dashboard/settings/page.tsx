"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Settings, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

interface SubscriptionData {
  tier: string;
  limits: Record<string, number | boolean>;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sentinel/subscription")
      .then((r) => r.json())
      .then((res) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your Sentinel subscription and preferences
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            Subscription activated successfully. Welcome to Sentinel {data?.tier}!
          </p>
        </div>
      )}

      {/* Subscription Info */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Subscription</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-xl font-bold">{data?.tier || "FREE"}</p>
          </div>
          {data?.subscription && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium capitalize">{data.subscription.status.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period Ends</p>
                <p className="text-sm">
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              {data.subscription.cancelAtPeriodEnd && (
                <div>
                  <p className="text-sm text-amber-600 font-medium">
                    Cancels at end of period
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {data?.tier === "FREE" ? (
            <Link href="/sentinel/pricing">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Upgrade Plan
              </Button>
            </Link>
          ) : (
            <Link href="/sentinel/pricing">
              <Button variant="outline">
                Change Plan <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Usage Limits */}
      {data?.limits && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Usage Limits</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.limits).map(([key, value]) => (
              <div key={key} className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-sm font-semibold mt-1">
                  {typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Documentation */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">API Documentation</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">POST /api/sentinel/reasoning</p>
            <p>AI-powered event analysis with chain-of-thought reasoning</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">POST /api/sentinel/screening</p>
            <p>Entity screening against sanctions, PEP, and adverse media databases</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">GET /api/sentinel/crisis-index</p>
            <p>Global Crisis Index scores for all tracked countries</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">POST /api/sentinel/supply-chain</p>
            <p>Supply chain risk assessment and portfolio analysis</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">GET /api/sentinel/intelligence</p>
            <p>Intelligence event feed with filtering and pagination</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">GET /api/sentinel/macro-market</p>
            <p>Macro market radar — commodities, forex, treasury, sector heatmaps</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">GET /api/sentinel/alerts</p>
            <p>Real-time intelligence alerts, source health, and keyword spike detection</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground mb-1">GET /api/sentinel/watchlists</p>
            <p>Manage entity and country watchlists for automated monitoring</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          All endpoints accept <code className="bg-muted px-1 rounded">Authorization: Bearer stl_...</code> header.
        </p>
      </div>
    </div>
  );
}

export default function SentinelSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
