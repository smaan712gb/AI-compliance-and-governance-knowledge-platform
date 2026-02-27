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
  { value: "SAP_ECC", label: "SAP ECC 6.0" },
  { value: "DYNAMICS_365", label: "Microsoft Dynamics 365 Finance & Operations" },
  { value: "WORKDAY", label: "Workday Financial Management" },
  { value: "ORACLE_CLOUD", label: "Oracle ERP Cloud (Fusion)" },
  { value: "NETSUITE", label: "Oracle NetSuite" },
  { value: "MOCK", label: "Mock Connector (Demo / Testing)" },
];

const SYNC_FREQUENCIES = [
  { value: "EVERY_HOUR", label: "Every Hour" },
  { value: "EVERY_4_HOURS", label: "Every 4 Hours" },
  { value: "EVERY_12_HOURS", label: "Every 12 Hours" },
  { value: "DAILY", label: "Daily" },
  { value: "MANUAL", label: "Manual Only" },
];

type FormState = {
  name: string;
  erpType: string;
  syncFrequency: string;
  // SAP
  baseUrl: string;
  sapClient: string;
  authMethod: string;
  username: string;
  password: string;
  tokenUrl: string;
  // D365
  tenantId: string;
  clientId: string;
  clientSecret: string;
  environmentUrl: string;
  legalEntityId: string;
  // Workday
  hostname: string;
  tenantName: string;
  // Oracle Cloud
  oracleHostname: string;
  oracleAuthMethod: string;
  oracleUsername: string;
  oraclePassword: string;
  oracleClientId: string;
  oracleClientSecret: string;
  defaultBusinessUnit: string;
  // NetSuite
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  // Mock
  companyName: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  erpType: "",
  syncFrequency: "DAILY",
  baseUrl: "",
  sapClient: "100",
  authMethod: "basic",
  username: "",
  password: "",
  tokenUrl: "",
  tenantId: "",
  clientId: "",
  clientSecret: "",
  environmentUrl: "",
  legalEntityId: "",
  hostname: "",
  tenantName: "",
  oracleHostname: "",
  oracleAuthMethod: "basic",
  oracleUsername: "",
  oraclePassword: "",
  oracleClientId: "",
  oracleClientSecret: "",
  defaultBusinessUnit: "",
  accountId: "",
  consumerKey: "",
  consumerSecret: "",
  tokenId: "",
  tokenSecret: "",
  companyName: "",
};

function buildConfig(form: FormState): Record<string, unknown> {
  switch (form.erpType) {
    case "MOCK":
      return {
        system: "MOCK",
        latencyMinMs: 50,
        latencyMaxMs: 500,
        recordsPerPull: 100,
        failureRate: 0,
      };
    case "SAP_S4HANA_CLOUD":
      return {
        system: "SAP_S4HANA_CLOUD",
        apiHost: form.baseUrl,
        sapClient: form.sapClient || "100",
        auth: form.authMethod === "oauth2_client_credentials"
          ? { method: "oauth2_client_credentials", tokenUrl: form.tokenUrl, clientId: form.username, clientSecret: form.password }
          : { method: "basic", username: form.username, password: form.password, client: form.sapClient || "100" },
      };
    case "SAP_S4HANA_ONPREM":
    case "SAP_ECC":
      return {
        system: form.erpType,
        hostname: form.baseUrl,
        port: 443,
        sapClient: form.sapClient || "100",
        auth: form.authMethod === "oauth2_client_credentials"
          ? { method: "oauth2_client_credentials", tokenUrl: form.tokenUrl, clientId: form.username, clientSecret: form.password }
          : { method: "basic", username: form.username, password: form.password, client: form.sapClient || "100" },
      };
    case "DYNAMICS_365":
      return {
        system: "DYNAMICS_365",
        tenantId: form.tenantId,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        environmentUrl: form.environmentUrl,
        legalEntityId: form.legalEntityId || undefined,
      };
    case "WORKDAY":
      return {
        system: "WORKDAY",
        hostname: form.hostname,
        tenantName: form.tenantName,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
      };
    case "ORACLE_CLOUD":
      return form.oracleAuthMethod === "oauth2"
        ? {
            system: "ORACLE_CLOUD",
            authMethod: "oauth2",
            hostname: form.oracleHostname,
            clientId: form.oracleClientId,
            clientSecret: form.oracleClientSecret,
            defaultBusinessUnit: form.defaultBusinessUnit || undefined,
          }
        : {
            system: "ORACLE_CLOUD",
            authMethod: "basic",
            hostname: form.oracleHostname,
            username: form.oracleUsername,
            password: form.oraclePassword,
            defaultBusinessUnit: form.defaultBusinessUnit || undefined,
          };
    case "NETSUITE":
      return {
        system: "NETSUITE",
        accountId: form.accountId,
        consumerKey: form.consumerKey,
        consumerSecret: form.consumerSecret,
        tokenId: form.tokenId,
        tokenSecret: form.tokenSecret,
      };
    default:
      return {};
  }
}

function isStep2Valid(form: FormState): boolean {
  switch (form.erpType) {
    case "MOCK": return true;
    case "SAP_S4HANA_CLOUD":
    case "SAP_S4HANA_ONPREM":
    case "SAP_ECC":
      return !!form.baseUrl && !!form.username && !!form.password;
    case "DYNAMICS_365":
      return !!form.tenantId && !!form.clientId && !!form.clientSecret && !!form.environmentUrl;
    case "WORKDAY":
      return !!form.hostname && !!form.tenantName && !!form.clientId && !!form.clientSecret;
    case "ORACLE_CLOUD":
      if (form.oracleAuthMethod === "oauth2") return !!form.oracleHostname && !!form.oracleClientId && !!form.oracleClientSecret;
      return !!form.oracleHostname && !!form.oracleUsername && !!form.oraclePassword;
    case "NETSUITE":
      return !!form.accountId && !!form.consumerKey && !!form.consumerSecret && !!form.tokenId && !!form.tokenSecret;
    default:
      return false;
  }
}

export default function NewConnectorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      const config = buildConfig(form);

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
              <Label>ERP System</Label>
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
              {form.erpType === "MOCK" ? "No credentials required — demo connector" : "Enter your system credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Mock */}
            {form.erpType === "MOCK" && (
              <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
                The mock connector generates realistic SOX, AML, access control, and audit trail data.
                No live ERP system required — perfect for demos and testing.
              </p>
            )}

            {/* SAP shared fields */}
            {(form.erpType === "SAP_S4HANA_CLOUD" || form.erpType === "SAP_S4HANA_ONPREM" || form.erpType === "SAP_ECC") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">
                    {form.erpType === "SAP_S4HANA_CLOUD" ? "API Host" : "Hostname"}
                  </Label>
                  <Input
                    id="baseUrl"
                    placeholder={form.erpType === "SAP_S4HANA_CLOUD" ? "my-api.s4hana.ondemand.com" : "my-sap.example.com"}
                    value={form.baseUrl}
                    onChange={(e) => updateForm("baseUrl", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sapClient">SAP Client</Label>
                  <Input id="sapClient" placeholder="100" value={form.sapClient} onChange={(e) => updateForm("sapClient", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Authentication</Label>
                  <Select value={form.authMethod} onValueChange={(v) => updateForm("authMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                      <SelectItem value="oauth2_client_credentials">OAuth2 Client Credentials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.authMethod === "oauth2_client_credentials" && (
                  <div className="space-y-2">
                    <Label htmlFor="tokenUrl">Token URL</Label>
                    <Input id="tokenUrl" placeholder="https://..." value={form.tokenUrl} onChange={(e) => updateForm("tokenUrl", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">{form.authMethod === "oauth2_client_credentials" ? "Client ID" : "Username"}</Label>
                  <Input id="username" value={form.username} onChange={(e) => updateForm("username", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{form.authMethod === "oauth2_client_credentials" ? "Client Secret" : "Password"}</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
                </div>
              </>
            )}

            {/* Dynamics 365 */}
            {form.erpType === "DYNAMICS_365" && (
              <>
                <p className="text-xs text-muted-foreground rounded border p-2 bg-blue-50 dark:bg-blue-950/30">
                  Requires an Azure AD App Registration with the <strong>user_impersonation</strong> permission on your Dynamics 365 environment.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Azure AD Tenant ID</Label>
                  <Input id="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.tenantId} onChange={(e) => updateForm("tenantId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">App Registration Client ID</Label>
                  <Input id="clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.clientId} onChange={(e) => updateForm("clientId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input id="clientSecret" type="password" value={form.clientSecret} onChange={(e) => updateForm("clientSecret", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="environmentUrl">D365 Environment URL</Label>
                  <Input id="environmentUrl" placeholder="https://mycompany.operations.dynamics.com" value={form.environmentUrl} onChange={(e) => updateForm("environmentUrl", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalEntityId">Legal Entity ID (optional)</Label>
                  <Input id="legalEntityId" placeholder="USMF" value={form.legalEntityId} onChange={(e) => updateForm("legalEntityId", e.target.value)} />
                </div>
              </>
            )}

            {/* Workday */}
            {form.erpType === "WORKDAY" && (
              <>
                <p className="text-xs text-muted-foreground rounded border p-2 bg-blue-50 dark:bg-blue-950/30">
                  Requires a Workday API Client (non-user, client_credentials grant) in your Workday tenant.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="hostname">Workday API Hostname</Label>
                  <Input id="hostname" placeholder="wd2-impl-services1.workday.com" value={form.hostname} onChange={(e) => updateForm("hostname", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Tenant Name</Label>
                  <Input id="tenantName" placeholder="mycompany_preview1" value={form.tenantName} onChange={(e) => updateForm("tenantName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input id="clientId" value={form.clientId} onChange={(e) => updateForm("clientId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input id="clientSecret" type="password" value={form.clientSecret} onChange={(e) => updateForm("clientSecret", e.target.value)} />
                </div>
              </>
            )}

            {/* Oracle Cloud */}
            {form.erpType === "ORACLE_CLOUD" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="oracleHostname">Oracle ERP Cloud Hostname</Label>
                  <Input id="oracleHostname" placeholder="fa-xxxx-dev.oraclecloud.com" value={form.oracleHostname} onChange={(e) => updateForm("oracleHostname", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select value={form.oracleAuthMethod} onValueChange={(v) => updateForm("oracleAuthMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                      <SelectItem value="oauth2">OAuth2 Client Credentials (IDCS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.oracleAuthMethod === "basic" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="oracleUsername">Username</Label>
                      <Input id="oracleUsername" value={form.oracleUsername} onChange={(e) => updateForm("oracleUsername", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oraclePassword">Password</Label>
                      <Input id="oraclePassword" type="password" value={form.oraclePassword} onChange={(e) => updateForm("oraclePassword", e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="oracleClientId">Client ID</Label>
                      <Input id="oracleClientId" value={form.oracleClientId} onChange={(e) => updateForm("oracleClientId", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oracleClientSecret">Client Secret</Label>
                      <Input id="oracleClientSecret" type="password" value={form.oracleClientSecret} onChange={(e) => updateForm("oracleClientSecret", e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="defaultBusinessUnit">Default Business Unit (optional)</Label>
                  <Input id="defaultBusinessUnit" placeholder="Vision Operations" value={form.defaultBusinessUnit} onChange={(e) => updateForm("defaultBusinessUnit", e.target.value)} />
                </div>
              </>
            )}

            {/* NetSuite */}
            {form.erpType === "NETSUITE" && (
              <>
                <p className="text-xs text-muted-foreground rounded border p-2 bg-blue-50 dark:bg-blue-950/30">
                  Requires a Token-Based Authentication (TBA) integration record in NetSuite with HMAC-SHA256.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID</Label>
                  <Input id="accountId" placeholder="1234567 or 1234567-SB1" value={form.accountId} onChange={(e) => updateForm("accountId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerKey">Consumer Key</Label>
                  <Input id="consumerKey" value={form.consumerKey} onChange={(e) => updateForm("consumerKey", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerSecret">Consumer Secret</Label>
                  <Input id="consumerSecret" type="password" value={form.consumerSecret} onChange={(e) => updateForm("consumerSecret", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenId">Token ID</Label>
                  <Input id="tokenId" value={form.tokenId} onChange={(e) => updateForm("tokenId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenSecret">Token Secret</Label>
                  <Input id="tokenSecret" type="password" value={form.tokenSecret} onChange={(e) => updateForm("tokenSecret", e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!isStep2Valid(form)}>
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
                <span className="text-muted-foreground">ERP System</span>
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
              {form.erpType === "DYNAMICS_365" && form.environmentUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-medium truncate max-w-[200px]">{form.environmentUrl}</span>
                </div>
              )}
              {form.erpType === "WORKDAY" && form.tenantName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-medium">{form.tenantName}</span>
                </div>
              )}
              {form.erpType === "ORACLE_CLOUD" && form.oracleHostname && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hostname</span>
                  <span className="font-medium">{form.oracleHostname}</span>
                </div>
              )}
              {form.erpType === "NETSUITE" && form.accountId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-medium">{form.accountId}</span>
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
