"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaseNote {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Case {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdById: string;
  assigneeId: string | null;
  eventIds: string[];
  tags: string[];
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
  assignee: { id: string; name: string | null; email: string | null } | null;
  _count?: { notes: number };
  notes?: CaseNote[];
  relatedEvents?: { id: string; headline: string; severity: string; category: string; countryCode: string | null }[];
}

interface CaseStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  avgResolutionHours: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_REVIEW: "bg-purple-100 text-purple-800 border-purple-200",
  ESCALATED: "bg-red-100 text-red-800 border-red-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-blue-100 text-blue-800",
};

const STATUSES = ["", "OPEN", "IN_PROGRESS", "PENDING_REVIEW", "ESCALATED", "RESOLVED", "CLOSED"];
const PRIORITIES = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    eventIds: "",
    tags: "",
  });
  const [creating, setCreating] = useState(false);

  // Expanded case
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<Case | null>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [noteInternal, setNoteInternal] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const res = await fetch(`/api/sentinel/cases?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load cases");
      setCases(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/sentinel/cases?view=stats");
      const data = await res.json();
      if (res.ok) setStats(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleCreate() {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: createForm.title.trim(),
        priority: createForm.priority,
      };
      if (createForm.description.trim()) body.description = createForm.description.trim();
      if (createForm.eventIds.trim()) {
        body.eventIds = createForm.eventIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (createForm.tags.trim()) {
        body.tags = createForm.tags.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const res = await fetch("/api/sentinel/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create case");

      setShowCreate(false);
      setCreateForm({ title: "", description: "", priority: "MEDIUM", eventIds: "", tags: "" });
      fetchCases();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedCase(null);
      return;
    }
    setExpandedId(id);
    setLoadingExpanded(true);
    try {
      const res = await fetch(`/api/sentinel/cases/${id}`);
      const data = await res.json();
      if (res.ok) setExpandedCase(data.data);
    } catch { /* ignore */ }
    setLoadingExpanded(false);
  }

  async function handleAddNote() {
    if (!noteContent.trim() || !expandedId) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/sentinel/cases/${expandedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim(), isInternal: noteInternal }),
      });
      if (res.ok) {
        setNoteContent("");
        setNoteInternal(false);
        // Re-fetch expanded case
        const r2 = await fetch(`/api/sentinel/cases/${expandedId}`);
        const d2 = await r2.json();
        if (r2.ok) setExpandedCase(d2.data);
      }
    } catch { /* ignore */ }
    setAddingNote(false);
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      const res = await fetch(`/api/sentinel/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchCases();
        fetchStats();
        if (expandedId === id) {
          const r2 = await fetch(`/api/sentinel/cases/${id}`);
          const d2 = await r2.json();
          if (r2.ok) setExpandedCase(d2.data);
        }
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Case Management</h1>
          <p className="text-muted-foreground">Track, investigate, and resolve intelligence cases</p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Case
        </Button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold font-mono">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Cases</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-blue-600">{stats.byStatus.OPEN || 0}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-amber-600">{stats.byStatus.IN_PROGRESS || 0}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-emerald-600">{stats.byStatus.RESOLVED || 0}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">New Case</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Case title"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Case description..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              maxLength={5000}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event IDs (comma-separated)</label>
              <input
                type="text"
                value={createForm.eventIds}
                onChange={(e) => setCreateForm((f) => ({ ...f, eventIds: e.target.value }))}
                placeholder="id1, id2, ..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={createForm.tags}
                onChange={(e) => setCreateForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, ..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.title.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Case
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

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

      {/* Case List */}
      {!loading && cases.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No cases found</p>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Case Header */}
              <button
                onClick={() => handleExpand(c.id)}
                className="w-full p-4 text-left hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm truncate">{c.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_COLORS[c.status] || ""}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[c.priority] || ""}`}>
                        {c.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>By {c.createdBy.name || c.createdBy.email}</span>
                      {c.assignee && <span>Assigned: {c.assignee.name || c.assignee.email}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {c._count?.notes || 0} notes
                      </span>
                    </div>
                  </div>
                  {expandedId === c.id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>
              </button>

              {/* Expanded */}
              {expandedId === c.id && (
                <div className="border-t p-4 space-y-4 bg-muted/20">
                  {loadingExpanded && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    </div>
                  )}

                  {expandedCase && !loadingExpanded && (
                    <>
                      {/* Description */}
                      {expandedCase.description && (
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Description</h4>
                          <p className="text-sm whitespace-pre-wrap">{expandedCase.description}</p>
                        </div>
                      )}

                      {/* Tags */}
                      {expandedCase.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {expandedCase.tags.map((t) => (
                            <span key={t} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded dark:bg-emerald-950 dark:text-emerald-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Related Events */}
                      {expandedCase.relatedEvents && expandedCase.relatedEvents.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Related Events</h4>
                          <div className="space-y-1">
                            {expandedCase.relatedEvents.map((evt) => (
                              <div key={evt.id} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                <span className="truncate">{evt.headline}</span>
                                <span className="text-xs text-muted-foreground">{evt.category}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Actions */}
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Update Status</h4>
                        <div className="flex gap-2 flex-wrap">
                          {STATUSES.filter(Boolean).filter((s) => s !== expandedCase.status).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusUpdate(expandedCase.id, s)}
                              className={`px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80 ${STATUS_COLORS[s] || ""}`}
                            >
                              {s.replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                          Notes ({expandedCase.notes?.length || 0})
                        </h4>
                        {expandedCase.notes && expandedCase.notes.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {expandedCase.notes.map((note) => (
                              <div key={note.id} className="rounded-md border bg-background p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {note.user.name || note.user.email}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(note.createdAt).toLocaleString()}
                                  </span>
                                  {note.isInternal && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                      Internal
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
                        )}

                        {/* Add Note */}
                        <div className="flex gap-2">
                          <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                            maxLength={10000}
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={handleAddNote}
                              disabled={addingNote || !noteContent.trim()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {addingNote
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Send className="h-4 w-4" />}
                            </Button>
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={noteInternal}
                                onChange={(e) => setNoteInternal(e.target.checked)}
                                className="accent-emerald-600"
                              />
                              Internal
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
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
