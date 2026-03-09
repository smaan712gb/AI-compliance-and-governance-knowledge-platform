"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Briefing {
  id: string;
  title: string;
  content: string;
  eventIds: string[];
  format: string;
  isPublished: boolean;
  createdAt: string;
}

export default function BriefingsPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createEventIds, setCreateEventIds] = useState("");
  const [creating, setCreating] = useState(false);

  // Expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBriefings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sentinel/briefings?page=${page}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load briefings");
      setBriefings(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBriefings(); }, [fetchBriefings]);

  async function handleCreate() {
    if (!createTitle.trim() || !createEventIds.trim()) return;
    setCreating(true);
    setError("");
    try {
      const eventIds = createEventIds.split(",").map((s) => s.trim()).filter(Boolean);
      if (eventIds.length === 0) throw new Error("At least one event ID is required");

      const res = await fetch("/api/sentinel/briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createTitle.trim(), eventIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate briefing");

      setShowCreate(false);
      setCreateTitle("");
      setCreateEventIds("");
      fetchBriefings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setCreating(false);
    }
  }

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /** Render markdown content as basic styled HTML */
  function renderMarkdown(md: string) {
    const html = md
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-emerald-700 dark:text-emerald-400">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-3 border-border" />')
      // Table rows
      .replace(/^\|(.+)\|$/gm, (match) => {
        if (/^\|[-|]+\|$/.test(match)) return ""; // Skip separator
        const cells = match.split("|").filter(Boolean).map((c) => c.trim());
        const tag = match.includes("Metric") || match.includes("-----") ? "th" : "td";
        return `<tr>${cells.map((c) => `<${tag} class="border px-2 py-1 text-sm">${c}</${tag}>`).join("")}</tr>`;
      })
      // Checkboxes
      .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2 text-sm mb-1"><input type="checkbox" disabled class="accent-emerald-600" /><span>$1</span></div>')
      // Bullet items
      .replace(/^- (.+)$/gm, '<li class="text-sm ml-4 list-disc">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<div class="mb-2"></div>')
      .replace(/\n/g, "<br />");

    return html;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Briefings</h1>
          <p className="text-muted-foreground">Generate and manage intelligence briefings from events</p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Briefing
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Generate New Briefing</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Weekly MENA Risk Briefing"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event IDs * (comma-separated)</label>
            <textarea
              value={createEventIds}
              onChange={(e) => setCreateEventIds(e.target.value)}
              placeholder="Paste event IDs separated by commas..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Find event IDs from the Intelligence Feed page
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={creating || !createTitle.trim() || !createEventIds.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      )}

      {/* Briefing List */}
      {!loading && briefings.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No briefings generated yet</p>
        </div>
      )}

      {!loading && briefings.length > 0 && (
        <div className="space-y-3">
          {briefings.map((b) => {
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id} className="rounded-lg border bg-card overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className="w-full p-4 text-left hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{b.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {b.eventIds.length} events
                        </span>
                        <span>{b.format}</span>
                        <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                        {b.isPublished && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Published
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>

                {/* Content */}
                {isExpanded && (
                  <div className="border-t p-4 bg-muted/20">
                    <div className="flex justify-end mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(b.content)}
                      >
                        {copied ? (
                          <>
                            <ClipboardCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy to Clipboard
                          </>
                        )}
                      </Button>
                    </div>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert rounded-md border bg-background p-5"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(b.content) }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
