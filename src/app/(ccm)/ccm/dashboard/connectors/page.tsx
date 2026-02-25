"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Plus,
  Plug,
  RefreshCw,
  TestTube,
  Loader2,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  erpType: string;
  status: string;
  lastTestedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  syncFrequency: string;
  isActive: boolean;
  createdAt: string;
  _count?: { syncJobs: number };
  lastSyncJob?: {
    status: string;
    recordsPulled: number | null;
    recordsFailed: number | null;
    completedAt: string | null;
  } | null;
}

const STATUS_DOT: Record<string, string> = {
  CONNECTED: "bg-green-500",
  TESTING: "bg-yellow-500 animate-pulse",
  SYNC_ERROR: "bg-red-500",
  DISCONNECTED: "bg-gray-400",
  PENDING_SETUP: "bg-blue-400",
  ERROR: "bg-red-500",
};

const STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONNECTED: "default",
  TESTING: "secondary",
  SYNC_ERROR: "destructive",
  ERROR: "destructive",
  DISCONNECTED: "secondary",
  PENDING_SETUP: "outline",
};

function SyncJobBadge({
  status,
}: {
  status: string;
}) {
  if (status === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
      <AlertCircle className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message?: string }>
  >({});

  function fetchConnectors() {
    fetch("/api/ccm/connectors")
      .then((r) => r.json())
      .then((res) => setConnectors(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchConnectors();
  }, []);

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: { success: false } }));
    try {
      const res = await fetch(`/api/ccm/connectors/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      const success = !!data.data?.success;
      setTestResults((prev) => ({
        ...prev,
        [id]: { success, message: data.data?.message || data.error },
      }));
      if (success) {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: "CONNECTED", lastTestedAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: "Network error" },
      }));
    } finally {
      setTestingId(null);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await fetch(`/api/ccm/connectors/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "ALL" }),
      });
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, lastSyncAt: new Date().toISOString() } : c
        )
      );
    } catch {
      //
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ERP Connectors</h1>
          <p className="text-muted-foreground">
            Connect and manage your enterprise ERP systems
          </p>
        </div>
        <Link href="/ccm/dashboard/connectors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Connector
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : connectors.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <Plug className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Connectors Yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Connect your first ERP system to start monitoring compliance
            controls. A Demo connector is included on all plans — no live ERP
            required.
          </p>
          <Link href="/ccm/dashboard/connectors/new" className="mt-4">
            <Button>Add Your First Connector</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => {
            const isTesting = testingId === connector.id;
            const isSyncing = syncingId === connector.id;
            const testResult = testResults[connector.id];

            return (
              <Card
                key={connector.id}
                className={
                  connector.status === "SYNC_ERROR" ||
                  connector.status === "ERROR"
                    ? "border-red-200"
                    : ""
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {connector.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          STATUS_DOT[connector.status] || "bg-gray-400"
                        }`}
                      />
                      <Badge
                        variant={STATUS_BADGE[connector.status] || "outline"}
                        className="text-xs"
                      >
                        {connector.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {connector.erpType.replace(/_/g, " ")}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Sync job status */}
                  {connector.lastSyncJob && (
                    <SyncJobBadge status={connector.lastSyncJob.status} />
                  )}

                  <div className="text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Sync Frequency
                      </span>
                      <span className="font-medium text-foreground">
                        {connector.syncFrequency}
                      </span>
                    </div>

                    {connector.lastSyncAt && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last Sync
                        </span>
                        <span>
                          {new Date(connector.lastSyncAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    )}

                    {connector.lastSyncJob?.recordsPulled != null && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Records Pulled
                        </span>
                        <span className="font-medium text-foreground">
                          {connector.lastSyncJob.recordsPulled.toLocaleString()}
                          {connector.lastSyncJob.recordsFailed
                            ? ` (${connector.lastSyncJob.recordsFailed} failed)`
                            : ""}
                        </span>
                      </div>
                    )}

                    {connector.lastError && (
                      <p className="text-xs text-destructive truncate pt-1">
                        {connector.lastError}
                      </p>
                    )}
                  </div>

                  {testResult && (
                    <p
                      className={`text-xs ${
                        testResult.success
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {testResult.success ? "✓ " : "✗ "}
                      {testResult.message ||
                        (testResult.success
                          ? "Connection successful"
                          : "Connection failed")}
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTesting || isSyncing}
                      onClick={() => handleTest(connector.id)}
                    >
                      {isTesting ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <TestTube className="mr-1 h-3 w-3" />
                      )}
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTesting || isSyncing}
                      onClick={() => handleSync(connector.id)}
                    >
                      {isSyncing ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3 w-3" />
                      )}
                      {isSyncing ? "Syncing…" : "Sync Now"}
                    </Button>
                    <Link href={`/ccm/dashboard/connectors/${connector.id}`}>
                      <Button size="sm" variant="ghost">
                        History
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
