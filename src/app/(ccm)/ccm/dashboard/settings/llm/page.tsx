"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Brain, Plus, Loader2, Trash2, Star } from "lucide-react";

interface LLMConfig {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  baseUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  apiKeyMasked: string;
  lastTestedAt: string | null;
}

const PROVIDERS = [
  { value: "OPENAI", label: "OpenAI" },
  { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" },
  { value: "GOOGLE_GEMINI", label: "Google Gemini" },
];

const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
  OPENAI: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4o-mini", name: "GPT-4o Mini" }],
  DEEPSEEK: [{ id: "deepseek-chat", name: "DeepSeek V3" }, { id: "deepseek-reasoner", name: "DeepSeek R1" }],
  AZURE_OPENAI: [{ id: "gpt-4o", name: "GPT-4o (Azure)" }],
  GOOGLE_GEMINI: [{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" }, { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }],
};

export default function LLMConfigPage() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    provider: "OPENAI",
    modelId: "gpt-4o",
    displayName: "",
    apiKey: "",
    baseUrl: "",
    isDefault: true,
  });

  useEffect(() => {
    fetch("/api/ccm/llm-config")
      .then((r) => r.json())
      .then((res) => setConfigs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ccm/llm-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save configuration");
        return;
      }
      // Refresh
      const refreshRes = await fetch("/api/ccm/llm-config");
      const refreshData = await refreshRes.json();
      setConfigs(refreshData.data || []);
      setDialogOpen(false);
      setForm({ provider: "OPENAI", modelId: "gpt-4o", displayName: "", apiKey: "", baseUrl: "", isDefault: true });
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(configId: string) {
    try {
      await fetch("/api/ccm/llm-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, isDefault: true }),
      });
      setConfigs((prev) => prev.map((c) => ({ ...c, isDefault: c.id === configId })));
    } catch {}
  }

  async function handleToggleActive(configId: string, isActive: boolean) {
    try {
      await fetch("/api/ccm/llm-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, isActive }),
      });
      setConfigs((prev) => prev.map((c) => (c.id === configId ? { ...c, isActive } : c)));
    } catch {}
  }

  async function handleDelete(configId: string) {
    try {
      await fetch("/api/ccm/llm-config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });
      setConfigs((prev) => prev.filter((c) => c.id !== configId));
    } catch {}
  }

  const availableModels = PROVIDER_MODELS[form.provider] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LLM Configuration</h1>
          <p className="text-muted-foreground">Configure your AI model providers (BYOK)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Provider</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add LLM Provider</DialogTitle>
              <DialogDescription>Your API key will be encrypted and tested before saving</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => {
                  const models = PROVIDER_MODELS[v] || [];
                  setForm((p) => ({ ...p, provider: v, modelId: models[0]?.id || "" }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={form.modelId} onValueChange={(v) => setForm((p) => ({ ...p, modelId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input placeholder="e.g., Production GPT-4o" value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." value={form.apiKey} onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))} />
              </div>
              {form.provider === "AZURE_OPENAI" && (
                <div className="space-y-2">
                  <Label>Base URL / Endpoint</Label>
                  <Input placeholder="https://your-resource.openai.azure.com/..." value={form.baseUrl} onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={form.isDefault} onCheckedChange={(v) => setForm((p) => ({ ...p, isDefault: v }))} />
                <Label>Set as default provider</Label>
              </div>
              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              <Button className="w-full" onClick={handleCreate} disabled={saving || !form.apiKey || !form.displayName}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test & Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />How BYOK Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Bring Your Own Key (BYOK) lets you use your own AI provider API keys for all CCM AI features
            (analysis, remediation plans, reports). Your API key is encrypted at rest using AES-256-GCM
            and is never exposed in the frontend. If no provider is configured, the platform defaults to
            DeepSeek.</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No LLM Providers Configured</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Add your API key to use AI features. The platform will use DeepSeek as a fallback.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Switch
                  checked={config.isActive}
                  onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{config.displayName}</h3>
                    {config.isDefault && <Badge variant="default"><Star className="h-3 w-3 mr-1" />Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.provider} / {config.modelId} — Key: {config.apiKeyMasked}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!config.isDefault && (
                    <Button size="sm" variant="outline" onClick={() => handleSetDefault(config.id)}>
                      Set Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(config.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
