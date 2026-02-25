"use client";

import { useEffect, useState } from "react";
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
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_CONNECTOR: "default",
  TEST_CONNECTOR: "secondary",
  TRIGGER_SYNC: "default",
  CREATE_RULE: "default",
  UPDATE_RULE: "secondary",
  UPDATE_FINDING: "secondary",
  GENERATE_REMEDIATION: "default",
  COLLECT_EVIDENCE: "default",
  GENERATE_REPORT: "default",
  RUN_AI_ANALYSIS: "default",
  INVITE_MEMBER: "default",
  UPDATE_MEMBER_ROLE: "secondary",
  UPDATE_ORG_SETTINGS: "secondary",
  UPDATE_LLM_CONFIG: "secondary",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 30;

  function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    fetch(`/api/ccm/audit-log?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setLogs(res.data || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchLogs(); }, [actionFilter, offset]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Immutable record of all platform actions</p>
      </div>

      <div className="flex gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "ALL" ? "" : v); setOffset(0); }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            <SelectItem value="CREATE_CONNECTOR">Create Connector</SelectItem>
            <SelectItem value="TEST_CONNECTOR">Test Connector</SelectItem>
            <SelectItem value="TRIGGER_SYNC">Trigger Sync</SelectItem>
            <SelectItem value="CREATE_RULE">Create Rule</SelectItem>
            <SelectItem value="UPDATE_RULE">Update Rule</SelectItem>
            <SelectItem value="UPDATE_FINDING">Update Finding</SelectItem>
            <SelectItem value="GENERATE_REMEDIATION">Generate Remediation</SelectItem>
            <SelectItem value="COLLECT_EVIDENCE">Collect Evidence</SelectItem>
            <SelectItem value="GENERATE_REPORT">Generate Report</SelectItem>
            <SelectItem value="RUN_AI_ANALYSIS">AI Analysis</SelectItem>
            <SelectItem value="INVITE_MEMBER">Invite Member</SelectItem>
            <SelectItem value="UPDATE_LLM_CONFIG">LLM Config Change</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground self-center">{total} total events</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-3"><div className="h-6 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Audit Events</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Actions will be logged here as your team uses the platform.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex items-center gap-3 py-3 text-sm">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <Badge variant={(ACTION_COLORS[log.action] || "outline") as "default" | "secondary" | "outline"}>
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                  {log.resourceType && (
                    <span className="text-muted-foreground">
                      {log.resourceType}
                      {log.resourceId && ` #${log.resourceId.slice(0, 8)}`}
                    </span>
                  )}
                  <div className="flex-1" />
                  {log.ipAddress && log.ipAddress !== "unknown" && (
                    <span className="text-xs text-muted-foreground">{log.ipAddress}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
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
