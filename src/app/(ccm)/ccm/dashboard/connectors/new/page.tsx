"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

const ERP_TYPES = [
  { value: "SAP_S4HANA_CLOUD", label: "SAP S/4HANA Cloud" },
  { value: "SAP_S4HANA_ONPREM", label: "SAP S/4HANA On-Premise" },
  { value: "SAP_ECC", label: "SAP ECC" },
  { value: "MOCK", label: "Mock Connector (Demo)" },
];

const SYNC_FREQUENCIES = [
  { value: "EVERY_HOUR", label: "Every Hour" },
  { value: "EVERY_4_HOURS", label: "Every 4 Hours" },
  { value: "EVERY_12_HOURS", label: "Every 12 Hours" },
  { value: "DAILY", label: "Daily" },
  { value: "MANUAL", label: "Manual Only" },
];

export default function NewConnectorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    erpType: "",
    syncFrequency: "DAILY",
    // SAP config
    baseUrl: "",
    client: "",
    authMethod: "basic",
    username: "",
    password: "",
    // Mock config
    companyName: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      let config: Record<string, unknown>;

      if (form.erpType === "MOCK") {
        config = {
          companyName: form.companyName || "Demo Company",
          simulateLatency: true,
          failureRate: 0,
        };
      } else {
        config = {
          systemType: form.erpType === "SAP_S4HANA_CLOUD" ? "S4HANA_CLOUD" : form.erpType === "SAP_S4HANA_ONPREM" ? "S4HANA_ONPREM" : "ECC",
          baseUrl: form.baseUrl,
          client: form.client,
          language: "EN",
          auth: {
            method: form.authMethod,
            username: form.username,
            password: form.password,
          },
        };
      }

      const res = await fetch("/api/ccm/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          erpType: form.erpType,
          syncFrequency: form.syncFrequency,
          config,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create connector");
        return;
      }

      router.push(`/ccm/dashboard/connectors/${data.data.id}`);
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ccm/dashboard/connectors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Connector</h1>
          <p className="text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Connector Details</CardTitle>
            <CardDescription>Choose your ERP system type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connector Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production SAP S/4HANA"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ERP Type</Label>
              <Select value={form.erpType} onValueChange={(v) => updateForm("erpType", v)}>
                <SelectTrigger><SelectValue placeholder="Select ERP type" /></SelectTrigger>
                <SelectContent>
                  {ERP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select value={form.syncFrequency} onValueChange={(v) => updateForm("syncFrequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!form.name || !form.erpType}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Connection Config */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Configuration</CardTitle>
            <CardDescription>
              {form.erpType === "MOCK"
                ? "Configure your demo connector"
                : "Enter your SAP system credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.erpType === "MOCK" ? (
              <div className="space-y-2">
                <Label htmlFor="companyName">Demo Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., Acme Corp"
                  value={form.companyName}
                  onChange={(e) => updateForm("companyName", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The mock connector generates realistic compliance data for testing and demos.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">SAP Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://my-sap.example.com:44300"
                    value={form.baseUrl}
                    onChange={(e) => updateForm("baseUrl", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">SAP Client</Label>
                  <Input
                    id="client"
                    placeholder="100"
                    value={form.client}
                    onChange={(e) => updateForm("client", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select value={form.authMethod} onValueChange={(v) => updateForm("authMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                      <SelectItem value="oauth2_client_credentials">OAuth2 Client Credentials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">
                    {form.authMethod === "oauth2_client_credentials" ? "Client ID" : "Username"}
                  </Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => updateForm("username", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {form.authMethod === "oauth2_client_credentials" ? "Client Secret" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Confirm your connector configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{form.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ERP Type</span>
                <span className="font-medium">
                  {ERP_TYPES.find((t) => t.value === form.erpType)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sync Frequency</span>
                <span className="font-medium">
                  {SYNC_FREQUENCIES.find((f) => f.value === form.syncFrequency)?.label}
                </span>
              </div>
              {form.erpType !== "MOCK" && form.baseUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base URL</span>
                  <span className="font-medium">{form.baseUrl}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Connector
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
