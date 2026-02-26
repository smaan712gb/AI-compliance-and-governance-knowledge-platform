"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Building2,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  Zap,
} from "lucide-react";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  companySize: string | null;
  role: string;
  memberCount: number;
}

interface SubscriptionData {
  tier: string;
  limits: {
    connectors: number;
    members: number;
    rules: number;
    aiAnalyses: number;
  };
  usage: { connectors: number; members: number; rules: number };
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; badge: string }
> = {
  starter: {
    label: "Starter",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "bg-blue-600",
  },
  professional: {
    label: "Professional",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    badge: "bg-purple-600",
  },
  enterprise: {
    label: "Enterprise",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    badge: "bg-amber-600",
  },
};

const UPGRADE_PATHS: Record<
  string,
  { to: string; price: string; benefits: string[] }
> = {
  starter: {
    to: "professional",
    price: "$1,499/mo",
    benefits: [
      "3 ERP connectors (vs 1)",
      "15 team members (vs 5)",
      "100 monitoring rules (vs 25)",
      "500 AI analyses/month (vs 100)",
      "PCI DSS + AML/BSA frameworks",
    ],
  },
  professional: {
    to: "enterprise",
    price: "$4,999/mo",
    benefits: [
      "Unlimited ERP connectors",
      "Unlimited team members",
      "All 8 compliance frameworks",
      "Unlimited AI analyses",
      "Dedicated Customer Success Manager",
    ],
  },
};

function daysUntil(dateStr: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  );
}

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, (used / max) * 100);
  const warning = !unlimited && pct >= 85;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={warning ? "text-amber-600 font-medium" : "text-muted-foreground"}>
          {used} / {unlimited ? "Unlimited" : max}
          {warning && " ⚠"}
        </span>
      </div>
      <Progress
        value={pct}
        className={warning ? "[&>div]:bg-amber-500" : ""}
      />
    </div>
  );
}

function SuccessBanner() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (params.get("checkout") === "success") {
      setShow(true);
      const t = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(t);
    }
  }, [params]);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3 mb-6">
      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold text-green-800">Subscription activated!</p>
        <p className="text-sm text-green-700 mt-0.5">
          Your CCM plan is now active. All features have been unlocked for your
          organization.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    industry: "",
    companySize: "",
  });

  function handleNameChange(name: string) {
    setForm((p) => ({
      ...p,
      name,
      slug: slugEdited
        ? p.slug
        : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    }));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/ccm/organizations").then((r) => r.json()),
      fetch("/api/ccm/subscription")
        .then((r) => r.json())
        .catch(() => ({ data: null })),
    ])
      .then(([orgRes, subRes]) => {
        setOrg(orgRes.data || null);
        setSub(subRes.data || null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateOrg() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/ccm/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create organization");
        return;
      }
      window.location.reload();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStartTrial() {
    setTrialLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ccm/trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start trial");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setTrialLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ccm/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open billing portal");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleSubscribe(plan: string) {
    setSubscribing(plan);
    setError("");
    try {
      const res = await fetch("/api/ccm/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push("/register?callbackUrl=/ccm/pricing");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start checkout. Please try again.");
        return;
      }
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── No org: creation form ────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Organization
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your CCM organization to get started with continuous
            compliance monitoring.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="Estee Lauder"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">
                Slug{" "}
                <span className="text-xs text-muted-foreground">
                  (auto-generated · editable)
                </span>
              </Label>
              <Input
                id="org-slug"
                placeholder="estee-lauder"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm((p) => ({
                    ...p,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from name. Lowercase, numbers, hyphens only.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-industry">Industry</Label>
              <Input
                id="org-industry"
                placeholder="Financial Services"
                value={form.industry}
                onChange={(e) =>
                  setForm((p) => ({ ...p, industry: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-size">Company Size</Label>
              <Input
                id="org-size"
                placeholder="e.g. 500–1,000 employees"
                value={form.companySize}
                onChange={(e) =>
                  setForm((p) => ({ ...p, companySize: e.target.value }))
                }
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleCreateOrg}
              disabled={creating || !form.name || !form.slug}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main settings ────────────────────────────────────────────────────────────
  const tier = sub?.tier && sub.tier !== "none" ? sub.tier : null;
  const tierConfig = tier ? TIER_CONFIG[tier] : null;
  const upgradePath = tier ? UPGRADE_PATHS[tier] : null;
  const daysLeft = sub?.subscription?.currentPeriodEnd
    ? daysUntil(sub.subscription.currentPeriodEnd)
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Organization and subscription management
        </p>
      </div>

      {/* Success banner (search-param driven) */}
      <Suspense>
        <SuccessBanner />
      </Suspense>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Organization Card ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          {tierConfig && (
            <div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierConfig.color}`}
              >
                {tierConfig.label} Plan
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slug</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
              {org.slug}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Role</span>
            <Badge variant="secondary">{org.role}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Team Members</span>
            <span>{org.memberCount}</span>
          </div>
          {org.industry && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry</span>
              <span>{org.industry}</span>
            </div>
          )}
          {org.companySize && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company Size</span>
              <span>{org.companySize}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Subscription Card ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            CCM Subscription
          </CardTitle>
          <CardDescription>
            {sub?.subscription?.status === "TRIALING"
              ? `14-day free trial — Professional access`
              : tier
              ? `Active ${tierConfig?.label} plan`
              : "No active CCM subscription"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── Trial banner ── */}
          {sub?.subscription?.status === "TRIALING" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-purple-800">
                  Professional Trial Active — {daysLeft} days remaining
                </p>
                <p className="text-sm text-purple-700 mt-0.5">
                  You have full Professional access. Subscribe below to keep
                  access after your trial ends on{" "}
                  {sub.subscription?.currentPeriodEnd
                    ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString()
                    : ""}
                  .
                </p>
              </div>
            </div>
          )}

          {/* ── Usage bars (shown for trial + active) ── */}
          {tier && sub && (
            <div className="space-y-4">
              <UsageBar
                label="ERP Connectors"
                used={sub.usage.connectors}
                max={sub.limits.connectors}
              />
              <UsageBar
                label="Team Members"
                used={sub.usage.members}
                max={sub.limits.members}
              />
              <UsageBar
                label="Monitoring Rules"
                used={sub.usage.rules}
                max={sub.limits.rules}
              />
            </div>
          )}

          {/* ── Active paid subscription controls ── */}
          {tier && sub && sub.subscription?.status === "ACTIVE" && (
            <>
              {sub.subscription && (
                <div
                  className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                    sub.subscription.cancelAtPeriodEnd
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {sub.subscription.cancelAtPeriodEnd ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span>
                    {sub.subscription.cancelAtPeriodEnd
                      ? `Subscription cancels on ${new Date(sub.subscription.currentPeriodEnd).toLocaleDateString()} (${daysLeft} days remaining)`
                      : `Renews on ${new Date(sub.subscription.currentPeriodEnd).toLocaleDateString()} — ${daysLeft} days remaining`}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-full sm:w-auto"
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Subscription &amp; Billing
              </Button>
              <p className="text-xs text-muted-foreground">
                Update payment method, download invoices, or cancel via the
                Stripe Billing Portal.
              </p>
            </>
          )}

          {/* ── No subscription: Start Free Trial CTA ── */}
          {!tier && !sub && (
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center space-y-3">
              <Zap className="h-8 w-8 text-primary mx-auto" />
              <div>
                <p className="font-semibold text-lg">Start your 14-day free trial</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Full Professional access — no credit card required. Includes 3 ERP connectors,
                  SOX + PCI DSS + AML/BSA, 100 monitoring rules, and 500 AI analyses/month.
                </p>
              </div>
              <Button onClick={handleStartTrial} disabled={trialLoading} size="lg">
                {trialLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Start Free Trial
              </Button>
              <p className="text-xs text-muted-foreground">
                Or subscribe directly to a paid plan below.
              </p>
            </div>
          )}

          {/* ── Plan options (shown for trial + no subscription) ── */}
          {(!tier || sub?.subscription?.status === "TRIALING") && (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  plan: "starter",
                  label: "Starter",
                  price: "$499/mo",
                  desc: "1 connector · 5 members · SOX",
                  popular: false,
                },
                {
                  plan: "professional",
                  label: "Professional",
                  price: "$1,499/mo",
                  desc: "3 connectors · 15 members · SOX + PCI + AML",
                  popular: true,
                },
                {
                  plan: "enterprise",
                  label: "Enterprise",
                  price: "$4,999/mo",
                  desc: "Unlimited · All 8 frameworks · CSM",
                  popular: false,
                },
              ].map((t) => (
                <div
                  key={t.plan}
                  className={`rounded-xl border p-4 space-y-3 ${
                    t.popular ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  {t.popular && (
                    <span className="inline-block text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      Most Popular
                    </span>
                  )}
                  <div>
                    <h3 className="font-semibold">{t.label}</h3>
                    <p className="text-2xl font-bold mt-1">{t.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.desc}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={t.popular ? "default" : "outline"}
                    disabled={subscribing !== null}
                    onClick={() => handleSubscribe(t.plan)}
                  >
                    {subscribing === t.plan ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-3 w-3" />
                    )}
                    Subscribe
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Upgrade nudge ──────────────────────────────────────────────────── */}
      {upgradePath && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Upgrade to{" "}
              {upgradePath.to.charAt(0).toUpperCase() +
                upgradePath.to.slice(1)}
            </CardTitle>
            <CardDescription>
              {upgradePath.price} · Unlock more capacity and frameworks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1.5">
              {upgradePath.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe(upgradePath.to)}
              disabled={subscribing !== null}
            >
              {subscribing === upgradePath.to ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Upgrade to{" "}
              {upgradePath.to.charAt(0).toUpperCase() + upgradePath.to.slice(1)}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
