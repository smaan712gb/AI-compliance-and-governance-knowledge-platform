"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Loader2,
  Star,
  Zap,
  AlertCircle,
  CheckCircle2,
  Info,
  Cpu,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LlmConfig {
  id: string;
  provider: string;
  modelId: string;
  displayName: string | null;
  baseUrl: string | null;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface TestResult {
  configId: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROVIDERS = [
  { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" },
  { value: "GOOGLE_GEMINI", label: "Google Gemini" },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  DEEPSEEK: "deepseek-reasoner",
  OPENAI: "gpt-4o",
  AZURE_OPENAI: "gpt-4o",
  GOOGLE_GEMINI: "gemini-2.0-flash",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  DEEPSEEK: "https://api.deepseek.com/v1",
  OPENAI: "https://api.openai.com/v1",
  AZURE_OPENAI: "https://<resource>.openai.azure.com/openai/deployments/<deployment>",
  GOOGLE_GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai",
};

const PROVIDER_COLORS: Record<string, string> = {
  DEEPSEEK: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  OPENAI: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  AZURE_OPENAI: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  GOOGLE_GEMINI: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LlmConfigsPage() {
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [provider, setProvider] = useState("DEEPSEEK");
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/sentinel/llm-configs");
      const data = await res.json();
      if (data?.data) setConfigs(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  /* ----- Create ----- */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setFormError("API key is required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/sentinel/llm-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          modelId: modelId.trim() || DEFAULT_MODELS[provider],
          displayName: displayName.trim() || undefined,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save configuration");
        return;
      }
      resetForm();
      setShowForm(false);
      loadConfigs();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setProvider("DEEPSEEK");
    setModelId("");
    setDisplayName("");
    setApiKey("");
    setBaseUrl("");
    setIsDefault(false);
    setFormError("");
  }

  /* ----- Test ----- */
  async function handleTest(configId: string) {
    setTestingId(configId);
    setTestResult(null);

    try {
      const res = await fetch("/api/sentinel/llm-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", configId }),
      });
      const data = await res.json();
      setTestResult({
        configId,
        success: res.ok,
        latencyMs: data.data?.latencyMs,
        error: data.error,
      });
      loadConfigs(); // refresh lastTestedAt / lastError
    } catch {
      setTestResult({ configId, success: false, error: "Network error" });
    } finally {
      setTestingId(null);
    }
  }

  /* ----- Delete ----- */
  async function handleDelete(configId: string) {
    setDeletingId(configId);
    try {
      await fetch(`/api/sentinel/llm-configs?id=${configId}`, {
        method: "DELETE",
      });
      loadConfigs();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  /* ----- Skeleton ----- */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Configurations</h1>
          <p className="text-muted-foreground">
            Bring your own API keys for reasoning and analysis models
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Config
        </Button>
      </div>

      {/* Platform Fallback Notice */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 flex gap-3">
        <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-800 dark:text-emerald-200">
          <p className="font-medium mb-1">Platform Fallback</p>
          <p className="text-emerald-700 dark:text-emerald-300">
            If no custom LLM is configured, Sentinel uses platform DeepSeek R1
            for reasoning and Groq Llama-3.3-70b for bias detection. Adding your
            own keys gives you full control over model selection, rate limits,
            and costs.
          </p>
        </div>
      </div>

      {/* Add Config Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border bg-card p-6 space-y-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">New LLM Configuration</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Provider */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model ID */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Model ID
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder={DEFAULT_MODELS[provider]}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Production Reasoning"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={100}
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                API Key <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                required
              />
            </div>

            {/* Base URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">
                Base URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={DEFAULT_BASE_URLS[provider]}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-emerald-600 h-4 w-4"
            />
            <span className="text-sm">Set as default configuration</span>
          </label>

          {formError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`rounded-lg border p-4 flex items-center gap-3 ${
            testResult.success
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
              : "border-destructive bg-destructive/5"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          )}
          <div className="text-sm">
            {testResult.success ? (
              <p className="text-emerald-800 dark:text-emerald-200">
                Connection successful
                {testResult.latencyMs != null && (
                  <span className="ml-1 font-mono">
                    ({testResult.latencyMs}ms)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-destructive">{testResult.error || "Test failed"}</p>
            )}
          </div>
          <button
            className="ml-auto text-xs text-muted-foreground hover:underline"
            onClick={() => setTestResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Config Cards */}
      {configs.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Cpu className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No LLM configurations yet. Add one to use your own API keys.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className="rounded-lg border bg-card p-5 space-y-3"
            >
              {/* Top row: provider badge + default star */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    PROVIDER_COLORS[cfg.provider] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {cfg.provider.replace("_", " ")}
                </span>
                {cfg.isDefault && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Default
                  </span>
                )}
              </div>

              {/* Display name + model */}
              <div>
                {cfg.displayName && (
                  <p className="font-medium text-sm">{cfg.displayName}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  {cfg.modelId}
                </p>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-0.5">
                {cfg.lastTestedAt && (
                  <p>
                    Last tested:{" "}
                    {new Date(cfg.lastTestedAt).toLocaleString()}
                  </p>
                )}
                {cfg.lastError && (
                  <p className="text-destructive">{cfg.lastError}</p>
                )}
                <p>
                  Added {new Date(cfg.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(cfg.id)}
                  disabled={testingId === cfg.id}
                >
                  {testingId === cfg.id ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Test
                </Button>
                <button
                  onClick={() => handleDelete(cfg.id)}
                  disabled={deletingId === cfg.id}
                  className="ml-auto p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-50"
                  title="Delete configuration"
                >
                  {deletingId === cfg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
