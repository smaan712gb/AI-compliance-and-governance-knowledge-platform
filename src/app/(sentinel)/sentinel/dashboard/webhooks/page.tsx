"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: string[];
  minSeverity: string;
  secret: string | null;
  isActive: boolean;
  lastDeliveryAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WebhookFormData {
  url: string;
  eventTypes: string[];
  minSeverity: string;
  secret: string;
  isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EVENT_TYPES = [
  { value: "intelligence_event", label: "Intelligence Event" },
  { value: "keyword_spike", label: "Keyword Spike" },
  { value: "crisis_escalation", label: "Crisis Escalation" },
  { value: "screening_alert", label: "Screening Alert" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const EVENT_TAG_STYLES: Record<string, string> = {
  intelligence_event: "bg-emerald-100 text-emerald-800",
  keyword_spike: "bg-purple-100 text-purple-800",
  crisis_escalation: "bg-red-100 text-red-800",
  screening_alert: "bg-amber-100 text-amber-800",
};

const EMPTY_FORM: WebhookFormData = {
  url: "",
  eventTypes: [],
  minSeverity: "medium",
  secret: "",
  isActive: true,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncateUrl(url: string, max = 50): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "\u2026";
}

function formatEventType(type: string): string {
  return EVENT_TYPES.find((e) => e.value === type)?.label ?? type;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Data fetching ---- */

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/sentinel/webhooks");
      const data = await res.json();
      if (data?.data) {
        setWebhooks(data.data);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch {
      setError("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  /* ---- Form handling ---- */

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(wh: WebhookEndpoint) {
    setEditingId(wh.id);
    setForm({
      url: wh.url,
      eventTypes: [...wh.eventTypes],
      minSeverity: wh.minSeverity,
      secret: "",
      isActive: wh.isActive,
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function toggleEventType(type: string) {
    setForm((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(type)
        ? prev.eventTypes.filter((t) => t !== type)
        : [...prev.eventTypes, type],
    }));
  }

  function validateForm(): string | null {
    if (!form.url.trim()) return "URL is required";
    try {
      new URL(form.url);
    } catch {
      return "Invalid URL format";
    }
    if (form.eventTypes.length === 0) return "Select at least one event type";
    if (form.secret && form.secret.length < 16) {
      return "Secret must be at least 16 characters";
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    const payload: Record<string, unknown> = {
      url: form.url.trim(),
      eventTypes: form.eventTypes,
      minSeverity: form.minSeverity,
      isActive: form.isActive,
    };
    if (form.secret) payload.secret = form.secret;
    if (editingId) payload.id = editingId;

    try {
      const res = await fetch("/api/sentinel/webhooks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to save webhook");
        return;
      }

      closeForm();
      loadWebhooks();
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Delete handling ---- */

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);

    try {
      const res = await fetch("/api/sentinel/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete webhook");
      }

      setDeletingId(null);
      loadWebhooks();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  /* ---- Loading skeleton ---- */

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-muted animate-pulse rounded" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure endpoints to receive real-time Sentinel alerts
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={openCreateForm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto text-destructive hover:text-destructive/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Webhook" : "Create Webhook"}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 rounded hover:bg-muted"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Endpoint URL
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://your-service.com/webhook"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Event types */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Types
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((evt) => (
                <label
                  key={evt.value}
                  className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    form.eventTypes.includes(evt.value)
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                      : "border-border hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.eventTypes.includes(evt.value)}
                    onChange={() => toggleEventType(evt.value)}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  <span className="text-sm">{evt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity + Active row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Minimum Severity
              </label>
              <select
                value={form.minSeverity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minSeverity: e.target.value }))
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {editingId && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Status
                </label>
                <label className="flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            )}
          </div>

          {/* Secret */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Signing Secret{" "}
              <span className="text-muted-foreground font-normal">
                (optional, min 16 characters)
              </span>
            </label>
            <input
              type="password"
              value={form.secret}
              onChange={(e) =>
                setForm((f) => ({ ...f, secret: e.target.value }))
              }
              placeholder={
                editingId
                  ? "Leave blank to keep existing secret"
                  : "HMAC signing secret"
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Form error */}
          {formError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {formError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {editingId ? "Update Webhook" : "Create Webhook"}
            </Button>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="rounded-lg border border-destructive/50 bg-card p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">
                Delete Webhook
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                This will permanently remove the webhook endpoint. Any pending
                deliveries will be lost. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks list */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center gap-2">
          <Webhook className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">
            {webhooks.filter((w) => w.isActive).length} Active Endpoint
            {webhooks.filter((w) => w.isActive).length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            / {webhooks.length} total
          </span>
        </div>

        {webhooks.length === 0 ? (
          /* Empty state */
          <div className="p-12 text-center">
            <Webhook className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No webhooks configured
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add one to receive real-time alerts.
            </p>
            {!showForm && (
              <Button
                onClick={openCreateForm}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className={`p-4 transition-colors ${
                  !wh.isActive ? "opacity-60" : ""
                }`}
              >
                {/* Top row: URL + status + actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* Active indicator dot */}
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          wh.isActive ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      <code className="text-sm font-mono truncate">
                        {truncateUrl(wh.url, 60)}
                      </code>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          wh.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {wh.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Event type tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wh.eventTypes.map((type) => (
                        <span
                          key={type}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            EVENT_TAG_STYLES[type] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {formatEventType(type)}
                        </span>
                      ))}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          SEVERITY_STYLES[wh.minSeverity] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {"\u2265"} {wh.minSeverity}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {wh.lastDeliveryAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last delivery {timeAgo(wh.lastDeliveryAt)}
                        </span>
                      )}
                      {wh.failureCount > 0 ? (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <XCircle className="h-3 w-3" />
                          {wh.failureCount} failure
                          {wh.failureCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          No failures
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditForm(wh)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(wh.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
