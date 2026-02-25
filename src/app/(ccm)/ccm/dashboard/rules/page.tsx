"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { Plus, BookOpen, Loader2, Library, CheckCircle2 } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  description: string;
  framework: string;
  controlId: string | null;
  domain: string;
  severity: string;
  isActive: boolean;
  isBuiltIn: boolean;
  _count: { runs: number };
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  LOW: "bg-blue-100 text-blue-800 border border-blue-200",
  INFO: "bg-gray-100 text-gray-800 border border-gray-200",
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");

  function fetchRules() {
    setLoading(true);
    fetch("/api/ccm/rules")
      .then((r) => r.json())
      .then((res) => setRules(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRules();
  }, []);

  async function toggleRule(ruleId: string, isActive: boolean) {
    try {
      await fetch("/api/ccm/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isActive }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive } : r))
      );
    } catch {}
  }

  async function loadBuiltInTemplates() {
    setLoadingTemplates(true);
    setTemplateMsg("");
    try {
      const res = await fetch("/api/ccm/rules/templates", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTemplateMsg(data.data?.message || "Templates loaded.");
        fetchRules();
      } else {
        setTemplateMsg(data.error || "Failed to load templates.");
      }
    } catch {
      setTemplateMsg("Network error. Please try again.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  const builtInCount = rules.filter((r) => r.isBuiltIn).length;
  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Monitoring Rules
          </h1>
          <p className="text-muted-foreground">
            {rules.length > 0
              ? `${activeCount} active · ${rules.length} total · ${builtInCount} built-in`
              : "Configure compliance monitoring rules"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadBuiltInTemplates}
            disabled={loadingTemplates}
          >
            {loadingTemplates ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Library className="mr-2 h-4 w-4" />
            )}
            Load Built-in Templates
          </Button>
          <Link href="/ccm/dashboard/rules/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </Link>
        </div>
      </div>

      {templateMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          {templateMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Rules Configured</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Load our built-in compliance templates to get started immediately,
            or create a custom rule.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={loadBuiltInTemplates}
              disabled={loadingTemplates}
            >
              {loadingTemplates ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Library className="mr-2 h-4 w-4" />
              )}
              Load Templates
            </Button>
            <Link href="/ccm/dashboard/rules/new">
              <Button variant="outline">Create Custom Rule</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={rule.isActive ? "" : "opacity-60"}
            >
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  aria-label={`Toggle ${rule.name}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{rule.name}</p>
                    {rule.isBuiltIn && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        Built-in
                      </span>
                    )}
                    {rule.controlId && (
                      <span className="inline-block font-mono text-xs text-muted-foreground">
                        {rule.controlId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {rule.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {rule.framework.replace(/_/g, " ")}
                  </Badge>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      SEVERITY_STYLES[rule.severity] || ""
                    }`}
                  >
                    {rule.severity}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {rule._count.runs} run{rule._count.runs !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
