"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Bell,
  FileText,
  Shield,
  Activity,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ---------- Types ---------- */

type TriageStatus =
  | "PENDING"
  | "SCREENING"
  | "SCORING"
  | "BRIEFING"
  | "NOTIFYING"
  | "COMPLETED"
  | "FAILED";

const STAGE_KEYS = [
  "screening",
  "scoring",
  "watchlist",
  "briefing",
  "case",
  "notify",
] as const;

interface TriageRun {
  id: string;
  status: TriageStatus;
  eventId: string;
  event?: {
    id: string;
    headline: string;
    severity: string;
    category: string;
  };
  stagesCompleted: string[];
  screeningIds: string[];
  crisisScore: number | null;
  briefingId: string | null;
  caseId: string | null;
  webhooksSent: number;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ---------- Constants ---------- */

const ALL_STATUSES: TriageStatus[] = [
  "PENDING",
  "SCREENING",
  "SCORING",
  "BRIEFING",
  "NOTIFYING",
  "COMPLETED",
  "FAILED",
];

const STATUS_STYLES: Record<TriageStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  SCREENING: "bg-sky-100 text-sky-800 border-sky-200",
  SCORING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  BRIEFING: "bg-violet-100 text-violet-800 border-violet-200",
  NOTIFYING: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_ICONS: Record<TriageStatus, typeof Clock> = {
  PENDING: Clock,
  SCREENING: Shield,
  SCORING: Activity,
  BRIEFING: FileText,
  NOTIFYING: Bell,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "text-red-600 font-bold",
  HIGH: "text-orange-600 font-semibold",
  MEDIUM: "text-yellow-600",
  LOW: "text-blue-600",
};

const STAGE_STYLES: Record<string, string> = {
  screening: "bg-sky-50 text-sky-700 border-sky-200",
  scoring: "bg-indigo-50 text-indigo-700 border-indigo-200",
  watchlist: "bg-amber-50 text-amber-700 border-amber-200",
  briefing: "bg-violet-50 text-violet-700 border-violet-200",
  case: "bg-emerald-50 text-emerald-700 border-emerald-200",
  notify: "bg-rose-50 text-rose-700 border-rose-200",
};

const PAGE_SIZE = 15;

/* ---------- Component ---------- */

export default function TriagePage() {
  const [runs, setRuns] = useState<TriageRun[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Manual trigger
  const [triggerEventId, setTriggerEventId] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  /* ---------- Fetch ---------- */

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/sentinel/triage?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch triage runs");
        return;
      }
      setRuns(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  /* ---------- Trigger ---------- */

  async function handleTrigger() {
    if (!triggerEventId.trim()) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/sentinel/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: triggerEventId.trim() }),
      });
      const data = await res.json();
      if (res.status === 202 || res.ok) {
        setTriggerResult({
          ok: true,
          message: `Triage accepted (run ${data.data?.id ?? "pending"})`,
        });
        setTriggerEventId("");
        // Refresh list after short delay
        setTimeout(() => fetchRuns(), 1500);
      } else {
        setTriggerResult({
          ok: false,
          message: data.error || "Trigger failed",
        });
      }
    } catch {
      setTriggerResult({ ok: false, message: "Network error" });
    } finally {
      setTriggering(false);
    }
  }

  /* ---------- Helpers ---------- */

  function formatDuration(ms: number | null): string {
    if (ms === null || ms === undefined) return "--";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalPages = meta?.totalPages ?? 1;

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-600" />
            Triage Agent Runs
          </h1>
          <p className="text-muted-foreground">
            Monitor automated triage pipeline executions and trigger manual runs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRuns()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Manual Trigger */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Manual Trigger
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium mb-1">Event ID</label>
            <input
              type="text"
              value={triggerEventId}
              onChange={(e) => setTriggerEventId(e.target.value)}
              placeholder="e.g. cm9abc123..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <Button
            onClick={handleTrigger}
            disabled={triggering || !triggerEventId.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {triggering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Trigger Triage
              </>
            )}
          </Button>
        </div>
        {triggerResult && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              triggerResult.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {triggerResult.ok ? (
              <CheckCircle2 className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            ) : (
              <XCircle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            )}
            {triggerResult.message}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {meta && (
          <span className="text-xs text-muted-foreground ml-auto">
            {meta.total} total run{meta.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-[2rem_1fr_6rem_7rem_12rem_5rem_4rem_5rem_8rem] gap-2 px-4 py-2.5 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
          <div />
          <div>Event</div>
          <div>Status</div>
          <div>Severity</div>
          <div>Stages</div>
          <div className="text-right">Crisis</div>
          <div className="text-right">Duration</div>
          <div className="text-right">Hooks</div>
          <div className="text-right">Created</div>
        </div>

        {/* Loading State */}
        {loading && runs.length === 0 && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading triage runs...
          </div>
        )}

        {/* Empty State */}
        {!loading && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Zap className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No triage runs found</p>
            <p className="text-xs">
              Trigger a manual run or wait for automatic processing
            </p>
          </div>
        )}

        {/* Rows */}
        {runs.map((run) => {
          const isExpanded = expandedId === run.id;
          const StatusIcon = STATUS_ICONS[run.status] ?? Clock;

          return (
            <div key={run.id} className="border-b last:border-b-0">
              {/* Main Row */}
              <div
                className="grid grid-cols-[2rem_1fr_6rem_7rem_12rem_5rem_4rem_5rem_8rem] gap-2 px-4 py-3 items-center hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() =>
                  setExpandedId(isExpanded ? null : run.id)
                }
              >
                {/* Expand Icon */}
                <div className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>

                {/* Event Headline */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {run.event?.headline ?? (
                      <span className="text-muted-foreground font-mono text-xs">
                        {run.eventId}
                      </span>
                    )}
                  </p>
                  {run.event?.category && (
                    <p className="text-xs text-muted-foreground truncate">
                      {run.event.category}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[run.status]}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {run.status}
                  </span>
                </div>

                {/* Severity */}
                <div
                  className={`text-xs ${
                    SEVERITY_STYLES[run.event?.severity ?? ""] ?? ""
                  }`}
                >
                  {run.event?.severity ?? "--"}
                </div>

                {/* Stages */}
                <div className="flex flex-wrap gap-1">
                  {STAGE_KEYS.map((stage) => {
                    const completed = run.stagesCompleted?.includes(stage);
                    return (
                      <span
                        key={stage}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          completed
                            ? STAGE_STYLES[stage]
                            : "bg-muted/30 text-muted-foreground/50 border-transparent"
                        }`}
                      >
                        {stage}
                      </span>
                    );
                  })}
                </div>

                {/* Crisis Score */}
                <div className="text-right">
                  {run.crisisScore !== null && run.crisisScore !== undefined ? (
                    <span
                      className={`text-sm font-bold font-mono ${
                        run.crisisScore >= 80
                          ? "text-red-600"
                          : run.crisisScore >= 60
                          ? "text-orange-600"
                          : run.crisisScore >= 40
                          ? "text-yellow-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {run.crisisScore}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </div>

                {/* Duration */}
                <div className="text-right text-xs font-mono text-muted-foreground">
                  {formatDuration(run.durationMs)}
                </div>

                {/* Webhooks */}
                <div className="text-right text-xs font-mono text-muted-foreground">
                  {run.webhooksSent ?? 0}
                </div>

                {/* Created At */}
                <div className="text-right text-xs text-muted-foreground">
                  {formatDate(run.createdAt)}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 py-4 bg-muted/10 border-t space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Run ID */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">
                        Run ID
                      </span>
                      <span className="font-mono text-xs break-all">
                        {run.id}
                      </span>
                    </div>

                    {/* Event ID */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">
                        Event ID
                      </span>
                      <span className="font-mono text-xs break-all">
                        {run.eventId}
                      </span>
                    </div>

                    {/* Updated At */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">
                        Last Updated
                      </span>
                      <span className="text-xs">
                        {formatDate(run.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Stages Detail */}
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                      Stages Completed
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(run.stagesCompleted ?? []).length > 0 ? (
                        run.stagesCompleted.map((stage) => (
                          <span
                            key={stage}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
                              STAGE_STYLES[stage] ??
                              "bg-muted text-muted-foreground border-muted"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {stage}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No stages completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Screening IDs */}
                  {run.screeningIds && run.screeningIds.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                        Screening IDs
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {run.screeningIds.map((sid) => (
                          <span
                            key={sid}
                            className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono"
                          >
                            {sid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap gap-4">
                    {run.caseId && (
                      <a
                        href={`/sentinel/dashboard/cases?id=${run.caseId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        Case: {run.caseId.slice(0, 12)}...
                      </a>
                    )}
                    {run.briefingId && (
                      <a
                        href={`/sentinel/dashboard/briefings?id=${run.briefingId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 hover:underline font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        Briefing: {run.briefingId.slice(0, 12)}...
                      </a>
                    )}
                  </div>

                  {/* Error */}
                  {run.error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <AlertTriangle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                      <strong>Error:</strong> {run.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "bg-emerald-600 text-white"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
