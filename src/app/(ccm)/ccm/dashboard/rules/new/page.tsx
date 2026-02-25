"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";

const FRAMEWORKS = [
  "SOX", "PCI_DSS", "HIPAA", "AML_BSA", "GDPR", "ISO_27001", "NIST_CSF", "CUSTOM",
];

const DOMAINS = [
  { value: "SOX_CONTROLS", label: "SOX Controls" },
  { value: "AML_KYC", label: "AML / KYC" },
  { value: "ACCESS_CONTROL", label: "Access Control" },
  { value: "AUDIT_TRAIL", label: "Audit Trail" },
  { value: "ALL", label: "All Domains" },
];

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const RULE_TYPES = [
  { value: "threshold", label: "Threshold — Flag when a value exceeds a limit" },
  { value: "pattern", label: "Pattern — Detect specific data patterns" },
  { value: "missing_control", label: "Missing Control — Alert when expected controls are absent" },
  { value: "sod", label: "Separation of Duties — Detect conflicting access" },
  { value: "access", label: "Access — Monitor user access violations" },
];

export default function NewRulePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    framework: "SOX",
    controlId: "",
    domain: "SOX_CONTROLS",
    severity: "MEDIUM",
    ruleType: "threshold",
    conditionsJson: '{\n  "field": "amount",\n  "operator": ">",\n  "value": 100000\n}',
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    let conditions;
    try {
      conditions = JSON.parse(form.conditionsJson);
    } catch {
      setError("Invalid conditions JSON");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/ccm/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          framework: form.framework,
          controlId: form.controlId || undefined,
          domain: form.domain,
          severity: form.severity,
          ruleDefinition: { type: form.ruleType, conditions },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create rule");
        return;
      }

      router.push("/ccm/dashboard/rules");
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ccm/dashboard/rules">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Rule</h1>
          <p className="text-muted-foreground">Define a new compliance monitoring rule</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Rule Definition
          </CardTitle>
          <CardDescription>Configure what this rule should monitor and flag</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input id="name" placeholder="e.g., High-Value Journal Entries" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" placeholder="Describe what this rule monitors..." value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Framework</Label>
              <Select value={form.framework} onValueChange={(v) => updateForm("framework", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (<SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="controlId">Control ID (optional)</Label>
              <Input id="controlId" placeholder="e.g., SOX-JE-001" value={form.controlId} onChange={(e) => updateForm("controlId", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Select value={form.domain} onValueChange={(v) => updateForm("domain", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => updateForm("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rule Type</Label>
            <Select value={form.ruleType} onValueChange={(v) => updateForm("ruleType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions (JSON)</Label>
            <Textarea id="conditions" className="font-mono text-sm" rows={6} value={form.conditionsJson} onChange={(e) => updateForm("conditionsJson", e.target.value)} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.name || !form.description}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Rule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
