"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Bell,
  BellOff,
  Globe,
  Tag,
  Search,
  Truck,
  BarChart3,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---- Types ----

interface WatchlistItem {
  value: string;
  label?: string;
}

interface Watchlist {
  id: string;
  name: string;
  type: string;
  items: WatchlistItem[];
  isActive: boolean;
  matchCount: number;
  unreadCount: number;
  lastMatchAt: string | null;
}

interface MatchEvent {
  id: string;
  headline: string;
  severity: string;
  category: string;
  countryCode: string | null;
  riskScore: number;
  processedAt: string;
}

interface Match {
  id: string;
  matchedItem: string;
  matchScore: number;
  isRead: boolean;
  createdAt: string;
  event: MatchEvent;
}

// ---- Constants ----

const TYPE_OPTIONS = [
  { value: "COUNTRY", label: "Country", icon: Globe },
  { value: "ENTITY", label: "Entity", icon: Search },
  { value: "KEYWORD", label: "Keyword", icon: Tag },
  { value: "SUPPLIER", label: "Supplier", icon: Truck },
  { value: "SECTOR", label: "Sector", icon: BarChart3 },
  { value: "ROUTE", label: "Route", icon: MapPin },
] as const;

const TYPE_COLORS: Record<string, string> = {
  COUNTRY: "bg-blue-100 text-blue-800 border-blue-200",
  ENTITY: "bg-purple-100 text-purple-800 border-purple-200",
  KEYWORD: "bg-amber-100 text-amber-800 border-amber-200",
  SUPPLIER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SECTOR: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ROUTE: "bg-rose-100 text-rose-800 border-rose-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  SENTINEL_CRITICAL: "bg-red-100 text-red-800",
  SENTINEL_HIGH: "bg-orange-100 text-orange-800",
  SENTINEL_MEDIUM: "bg-yellow-100 text-yellow-800",
  SENTINEL_LOW: "bg-blue-100 text-blue-800",
  INFO: "bg-gray-100 text-gray-800",
};

function severityLabel(s: string) {
  return s.replace("SENTINEL_", "").toLowerCase();
}

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- Component ----

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("COUNTRY");
  const [formItems, setFormItems] = useState("");
  const [formAlert, setFormAlert] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // Expanded watchlist (matches)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWatchlists = useCallback(async () => {
    try {
      const res = await fetch("/api/sentinel/watchlists");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load watchlists");
        return;
      }
      setWatchlists(data.data || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  async function handleCreate() {
    setFormError("");
    const lines = formItems
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!formName.trim()) {
      setFormError("Name is required");
      return;
    }
    if (lines.length === 0) {
      setFormError("At least one item is required");
      return;
    }
    if (lines.length > 50) {
      setFormError("Maximum 50 items per watchlist");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/sentinel/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          items: lines.map((value) => ({ value })),
          alertOnMatch: formAlert,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create watchlist");
        return;
      }

      setFormName("");
      setFormType("COUNTRY");
      setFormItems("");
      setFormAlert(true);
      setShowForm(false);
      await fetchWatchlists();
    } catch {
      setFormError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setMatches([]);
      return;
    }

    setExpandedId(id);
    setMatchesLoading(true);
    try {
      const res = await fetch(`/api/sentinel/watchlists/${id}?limit=10`);
      const data = await res.json();
      if (res.ok) {
        setMatches(data.data?.matches || []);
      }
    } catch {
      // silently fail
    } finally {
      setMatchesLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch(`/api/sentinel/watchlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      });
      await fetchWatchlists();
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sentinel/watchlists/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteId(null);
        if (expandedId === id) {
          setExpandedId(null);
          setMatches([]);
        }
        await fetchWatchlists();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-muted-foreground">Loading watchlists...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError("");
            setLoading(true);
            fetchWatchlists();
          }}
          className="mt-3"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watchlists</h1>
          <p className="text-muted-foreground text-sm">
            Monitor countries, entities, keywords, and supply chain routes for real-time alerts
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {showForm ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Watchlist
            </>
          )}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">New Watchlist</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Critical Suppliers"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Items (one per line, max 50)
            </label>
            <textarea
              value={formItems}
              onChange={(e) => setFormItems(e.target.value)}
              placeholder={
                formType === "COUNTRY"
                  ? "UA\nRU\nCN\nIR"
                  : formType === "KEYWORD"
                  ? "sanctions\nnuclear\ncyberattack"
                  : "Huawei\nTSMC\nBoeing"
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px] font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alertOnMatch"
              checked={formAlert}
              onChange={(e) => setFormAlert(e.target.checked)}
              className="accent-emerald-600"
            />
            <label htmlFor="alertOnMatch" className="text-sm">
              Alert on match
            </label>
          </div>

          {formError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </>
            )}
          </Button>
        </div>
      )}

      {/* Watchlist Cards */}
      {watchlists.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No watchlists yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a watchlist to start monitoring events for your critical entities, countries, and keywords.
          </p>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Watchlist
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {watchlists.map((wl) => {
            const TypeIcon =
              TYPE_OPTIONS.find((t) => t.value === wl.type)?.icon || Tag;
            const isExpanded = expandedId === wl.id;

            return (
              <div
                key={wl.id}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* Card Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => handleExpand(wl.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}

                  <TypeIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{wl.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          TYPE_COLORS[wl.type] || ""
                        }`}
                      >
                        {wl.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{wl.items.length} items</span>
                      <span>{wl.matchCount} matches</span>
                      <span>Last: {relativeTime(wl.lastMatchAt)}</span>
                    </div>
                  </div>

                  {/* Unread badge */}
                  {wl.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold min-w-[22px] h-[22px] px-1.5">
                      {wl.unreadCount}
                    </span>
                  )}

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {wl.unreadCount > 0 && (
                      <button
                        onClick={() => handleMarkRead(wl.id)}
                        title="Mark all read"
                        className="p-1.5 rounded hover:bg-accent transition-colors"
                      >
                        <CheckCheck className="h-4 w-4 text-emerald-600" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setDeleteId(deleteId === wl.id ? null : wl.id)
                      }
                      title="Delete watchlist"
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteId === wl.id && (
                  <div className="px-4 pb-3 flex items-center gap-2 text-sm">
                    <span className="text-destructive font-medium">
                      Delete this watchlist?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(wl.id)}
                      disabled={deleting}
                      className="h-7 text-xs"
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(null)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Expanded: Items + Matches */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-3">
                    {/* Watched items */}
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Watched Items
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {wl.items.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-mono"
                          >
                            {item.label || item.value}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Matches */}
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Recent Matches
                      </h4>

                      {matchesLoading ? (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                          <span className="text-xs text-muted-foreground">
                            Loading matches...
                          </span>
                        </div>
                      ) : matches.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No matches yet. Events will appear here when they match your watchlist items.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {matches.map((match) => (
                            <div
                              key={match.id}
                              className={`rounded-md border p-3 text-sm ${
                                match.isRead
                                  ? "bg-background"
                                  : "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm leading-snug">
                                    {match.event.headline}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span
                                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        SEVERITY_COLORS[match.event.severity] || ""
                                      }`}
                                    >
                                      {severityLabel(match.event.severity)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {match.event.category}
                                    </span>
                                    {match.event.countryCode && (
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {match.event.countryCode}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      Matched: <strong>{match.matchedItem}</strong>
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {relativeTime(match.createdAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
