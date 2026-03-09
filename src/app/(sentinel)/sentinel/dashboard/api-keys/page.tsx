"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  tier: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function loadKeys() {
    try {
      const res = await fetch("/api/sentinel/api-keys");
      const data = await res.json();
      if (data?.data) setKeys(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadKeys(); }, []);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/sentinel/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create key");
        return;
      }

      setNewKeyValue(data.data.key);
      setNewKeyName("");
      loadKeys();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await fetch(`/api/sentinel/api-keys?id=${id}`, { method: "DELETE" });
      loadKeys();
    } catch {
      // ignore
    }
  }

  function copyKey() {
    if (!newKeyValue) return;
    navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your Sentinel API keys for programmatic access (Pro+ tier)
        </p>
      </div>

      {/* New key reveal */}
      {newKeyValue && (
        <div className="rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950 p-5">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
            New API Key Created
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white dark:bg-gray-900 border px-3 py-2 text-sm font-mono break-all">
              {newKeyValue}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setNewKeyValue(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Create key */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold mb-3">Create New Key</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production, Testing)"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={100}
          />
          <Button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Key
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </div>

      {/* Keys list */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center gap-2">
          <Key className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">
            {keys.filter((k) => k.isActive).length} Active Keys
          </span>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No API keys yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">
                    {k.name}
                    {!k.isActive && (
                      <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {k.prefix}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && (
                      <> · Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">
                    {k.tier}
                  </span>
                  {k.isActive && (
                    <button
                      onClick={() => handleDeactivate(k.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                      title="Deactivate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
