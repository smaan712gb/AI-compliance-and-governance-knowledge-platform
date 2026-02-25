"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  framework: string | null;
  controlId: string | null;
  createdAt: string;
  rule: { id: string; name: string; framework: string; controlId: string | null } | null;
  remediationPlan: { id: string; approvedAt: string | null } | null;
  _count: { dataPoints: number };
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  LOW: "bg-blue-100 text-blue-800 border border-blue-200",
  INFO: "bg-gray-100 text-gray-800 border border-gray-200",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700 border border-red-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  REMEDIATED: "bg-green-50 text-green-700 border border-green-200",
  CLOSED: "bg-gray-50 text-gray-600 border border-gray-200",
  ACCEPTED_RISK: "bg-purple-50 text-purple-700 border border-purple-200",
  FALSE_POSITIVE: "bg-gray-50 text-gray-500 border border-gray-200",
};

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function exportCSV(rows: Finding[]) {
  const headers = [
    "ID",
    "Title",
    "Severity",
    "Status",
    "Framework",
    "Control ID",
    "Rule",
    "Created At",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((f) =>
    [
      f.id,
      f.title,
      f.severity,
      f.status,
      f.rule?.framework || f.framework || "",
      f.rule?.controlId || f.controlId || "",
      f.rule?.name || "",
      f.createdAt,
    ]
      .map(escape)
      .join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ccm-findings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    datePreset: "",
  });
  const limit = 20;

  const fetchFindings = useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.datePreset) {
      params.set("dateFrom", daysAgoISO(Number(filters.datePreset)));
    }
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    fetch(`/api/ccm/findings?${params}`)
      .then((r) => r.json())
      .then((res) => {
        const sorted = (res.data || []).sort(
          (a: Finding, b: Finding) =>
            (SEVERITY_ORDER[a.severity] ?? 99) -
              (SEVERITY_ORDER[b.severity] ?? 99) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setFindings(sorted);
        setTotal(res.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, offset]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === findings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(findings.map((f) => f.id)));
    }
  }

  async function handleBulkUpdate() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/ccm/findings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      );
      fetchFindings();
      setBulkStatus("");
    } catch {
      // silently retry
    } finally {
      setBulkLoading(false);
    }
  }

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((p) => ({ ...p, [key]: value === "__all__" ? "" : value }));
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Findings</h1>
          <p className="text-muted-foreground">
            Compliance issues detected by monitoring rules
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={findings.length === 0}
          onClick={() => exportCSV(findings)}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status || "__all__"}
          onValueChange={(v) => setFilter("status", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="REMEDIATED">Remediated</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="ACCEPTED_RISK">Accepted Risk</SelectItem>
            <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity || "__all__"}
          onValueChange={(v) => setFilter("severity", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.datePreset || "__all__"}
          onValueChange={(v) => setFilter("datePreset", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Time</SelectItem>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.days} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Bulk Actions ──────────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Mark as…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REMEDIATED">Remediated</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ACCEPTED_RISK">Accepted Risk</SelectItem>
              <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkStatus || bulkLoading}
            onClick={handleBulkUpdate}
          >
            {bulkLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Findings List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : findings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Findings</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            {filters.status || filters.severity || filters.datePreset
              ? "No findings match your current filters."
              : "No compliance issues detected yet. Connect an ERP and run monitoring rules to start."}
          </p>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={selected.size === findings.length && findings.length > 0}
              onChange={toggleSelectAll}
              aria-label="Select all"
              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
            />
            <span>
              {total} finding{total !== 1 ? "s" : ""}
              {filters.status || filters.severity || filters.datePreset
                ? " (filtered)"
                : ""}
            </span>
          </div>

          <div className="space-y-2">
            {findings.map((finding) => (
              <Card
                key={finding.id}
                className={`transition-colors ${
                  selected.has(finding.id)
                    ? "border-primary/50 bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selected.has(finding.id)}
                    onChange={() => toggleSelect(finding.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${finding.title}`}
                    className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer flex-shrink-0"
                  />
                  <Link
                    href={`/ccm/dashboard/findings/${finding.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{finding.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {finding.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          SEVERITY_STYLES[finding.severity] || ""
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[finding.status] || ""
                        }`}
                      >
                        {finding.status.replace(/_/g, " ")}
                      </span>
                      {finding.rule && (
                        <Badge variant="outline" className="text-xs">
                          {finding.rule.framework.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(finding.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of{" "}
                {total}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
