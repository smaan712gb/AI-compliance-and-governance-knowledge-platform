"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Info,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: "success" | "failure" | "denied";
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown> | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    actions: string[];
    resourceTypes: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE_OPTIONS = [25, 50, 100];

/** Map action prefix to a colour scheme */
function actionBadgeStyle(action: string): string {
  if (/^(DELETE_|WEBHOOK_DELETED)/i.test(action))
    return "bg-red-100 text-red-800 border-red-200";
  if (/^(UPDATE_|MEMBER_)/i.test(action))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (/^(CREATE_|GENERATE_)/i.test(action))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (/^(VIEW_|SEARCH_|EXPORT_)/i.test(action))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function resultBadgeStyle(result: string): string {
  if (result === "success") return "bg-emerald-100 text-emerald-800";
  if (result === "failure") return "bg-red-100 text-red-800";
  if (result === "denied") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  /* Data state */
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<
    string[]
  >([]);

  /* Filter state */
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orgIdFilter, setOrgIdFilter] = useState("");

  /* UI state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchLogs = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (orgIdFilter) params.set("organizationId", orgIdFilter);

      try {
        const res = await fetch(
          `/api/sentinel/audit-logs?${params.toString()}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error ?? `Request failed with status ${res.status}`
          );
        }
        const json: AuditLogResponse = await res.json();
        setEntries(json.data);
        setPagination(json.pagination);
        if (json.filters?.actions) setAvailableActions(json.filters.actions);
        if (json.filters?.resourceTypes)
          setAvailableResourceTypes(json.filters.resourceTypes);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setLoading(false);
      }
    },
    [
      actionFilter,
      resourceTypeFilter,
      dateFrom,
      dateTo,
      orgIdFilter,
      pagination.limit,
    ]
  );

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  function handleApplyFilters() {
    fetchLogs(1);
  }

  function handleClearFilters() {
    setActionFilter("");
    setResourceTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setOrgIdFilter("");
    // Fetch after state is cleared — use a timeout so state settles
    setTimeout(() => fetchLogs(1), 0);
  }

  function handlePageChange(newPage: number) {
    fetchLogs(newPage);
  }

  function handleLimitChange(newLimit: number) {
    fetchLogs(1, newLimit);
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            SOC&nbsp;2 compliant activity trail across all Sentinel API actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            disabled={entries.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* SOC 2 Compliance Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">
            SOC&nbsp;2 Compliance
          </p>
          <p className="mt-0.5 text-sm text-emerald-700">
            All API actions are logged for SOC&nbsp;2 compliance. Logs are
            retained for 90&nbsp;days.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            Filters
            {(actionFilter ||
              resourceTypeFilter ||
              dateFrom ||
              dateTo ||
              orgIdFilter) && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Active
              </span>
            )}
          </span>
          <ChevronRight
            className={`h-4 w-4 text-gray-400 transition-transform ${
              filtersOpen ? "rotate-90" : ""
            }`}
          />
        </button>

        {filtersOpen && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Action Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Action Type
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All actions</option>
                  {availableActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Resource Type
                </label>
                <select
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All resources</option>
                  {availableResourceTypes.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Organization ID */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Organization ID
                </label>
                <input
                  type="text"
                  value={orgIdFilter}
                  onChange={(e) => setOrgIdFilter(e.target.value)}
                  placeholder="org_..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={handleApplyFilters}>
                <Search className="mr-1.5 h-4 w-4" />
                Apply Filters
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-500"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Result
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-emerald-500" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    <Info className="mx-auto mb-2 h-5 w-5 text-gray-300" />
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-gray-50/60"
                  >
                    {/* Timestamp */}
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                      {formatTimestamp(entry.timestamp)}
                    </td>

                    {/* Action */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${actionBadgeStyle(
                          entry.action
                        )}`}
                      >
                        {entry.action}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">
                        {entry.resourceType}
                      </div>
                      {entry.resourceId && (
                        <div className="mt-0.5 truncate font-mono text-xs text-gray-400">
                          {entry.resourceId}
                        </div>
                      )}
                    </td>

                    {/* Result */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${resultBadgeStyle(
                          entry.result
                        )}`}
                      >
                        {entry.result}
                      </span>
                    </td>

                    {/* IP */}
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                      {entry.ipAddress ?? "\u2014"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>
                &ndash;
                <span className="font-medium text-gray-700">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                entries
              </span>
              <span className="text-gray-300">|</span>
              <label className="flex items-center gap-1">
                Rows
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              {Array.from(
                { length: Math.min(pagination.totalPages, 7) },
                (_, i) => {
                  let page: number;
                  if (pagination.totalPages <= 7) {
                    page = i + 1;
                  } else if (pagination.page <= 4) {
                    page = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 3) {
                    page = pagination.totalPages - 6 + i;
                  } else {
                    page = pagination.page - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={loading}
                      className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                        page === pagination.page
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() => handlePageChange(pagination.page + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
