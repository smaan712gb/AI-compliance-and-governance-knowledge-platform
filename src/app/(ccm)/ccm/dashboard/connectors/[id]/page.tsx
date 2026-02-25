"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TestTube, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface ConnectorDetail {
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
}

export default function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [connector, setConnector] = useState<ConnectorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; errors?: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/ccm/connectors")
      .then((r) => r.json())
      .then((res) => {
        const found = (res.data || []).find((c: ConnectorDetail) => c.id === id);
        setConnector(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ccm/connectors/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data.data);
      if (data.data?.success && connector) {
        setConnector({ ...connector, status: "CONNECTED", lastTestedAt: new Date().toISOString() });
      }
    } catch {
      setTestResult({ success: false, errors: ["Network error"] });
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch(`/api/ccm/connectors/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "ALL" }),
      });
      if (connector) {
        setConnector({ ...connector, lastSyncAt: new Date().toISOString() });
      }
    } catch {} finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!connector) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Connector not found</h2>
        <Link href="/ccm/dashboard/connectors"><Button variant="outline" className="mt-4">Back to Connectors</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ccm/dashboard/connectors">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{connector.name}</h1>
          <p className="text-muted-foreground">{connector.erpType.replace(/_/g, " ")}</p>
        </div>
        <Badge variant={connector.status === "CONNECTED" ? "default" : "secondary"}>
          {connector.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{connector.status.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sync Frequency</span>
              <span>{connector.syncFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(connector.createdAt).toLocaleDateString()}</span>
            </div>
            {connector.lastTestedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Tested</span>
                <span>{new Date(connector.lastTestedAt).toLocaleString()}</span>
              </div>
            )}
            {connector.lastSyncAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sync</span>
                <span>{new Date(connector.lastSyncAt).toLocaleString()}</span>
              </div>
            )}
            {connector.lastError && (
              <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive text-xs">
                {connector.lastError}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Test and sync your connector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>
            <Button className="w-full" variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Trigger Full Sync
            </Button>

            {testResult && (
              <div className={`rounded-lg border p-3 text-sm ${testResult.success ? "border-green-500/50 bg-green-50 dark:bg-green-950" : "border-destructive/50 bg-destructive/10"}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">
                    {testResult.success ? "Connection successful" : "Connection failed"}
                  </span>
                </div>
                {testResult.latencyMs && (
                  <p className="text-xs text-muted-foreground mt-1">Latency: {testResult.latencyMs}ms</p>
                )}
                {testResult.errors && testResult.errors.length > 0 && (
                  <ul className="text-xs mt-1 space-y-1">
                    {testResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
