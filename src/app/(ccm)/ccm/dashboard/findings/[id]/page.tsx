"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Brain, Loader2, FileText } from "lucide-react";

interface FindingDetail {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  framework: string | null;
  controlId: string | null;
  aiAnalysis: string | null;
  createdAt: string;
  resolvedAt: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  resolutionNotes: string | null;
  rule: { name: string; framework: string; controlId: string | null } | null;
  remediationPlan: { id: string; status: string; steps: unknown[]; aiResponse: string } | null;
  dataPoints: { dataPoint: { id: string; domain: string; dataType: string; data: unknown } }[];
}

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [notes, setNotes] = useState("");
  const [remediationText, setRemediationText] = useState("");

  useEffect(() => {
    fetch(`/api/ccm/findings/${id}`)
      .then((r) => r.json())
      .then((res) => {
        setFinding(res.data || null);
        setStatusValue(res.data?.status || "");
        setNotes(res.data?.resolutionNotes || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdateStatus() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/ccm/findings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue, resolutionNotes: notes || undefined }),
      });
      const data = await res.json();
      if (res.ok && finding) {
        setFinding({ ...finding, status: data.data.status, resolutionNotes: data.data.resolutionNotes });
      }
    } catch {} finally {
      setUpdating(false);
    }
  }

  async function handleGenerateRemediation() {
    setGenerating(true);
    setRemediationText("");
    try {
      const res = await fetch(`/api/ccm/findings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.data?.plan) {
        setRemediationText(data.data.plan.aiResponse || "");
        if (finding) {
          setFinding({ ...finding, remediationPlan: data.data.plan });
        }
      }
    } catch {} finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!finding) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Finding not found</h2>
        <Link href="/ccm/dashboard/findings"><Button variant="outline" className="mt-4">Back to Findings</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ccm/dashboard/findings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{finding.title}</h1>
          <p className="text-muted-foreground">{finding.description}</p>
        </div>
        <Badge variant={finding.severity === "CRITICAL" || finding.severity === "HIGH" ? "destructive" : "default"}>
          {finding.severity}
        </Badge>
        <Badge variant="outline">{finding.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Framework</span><span>{finding.framework || finding.rule?.framework || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Control</span><span>{finding.controlId || finding.rule?.controlId || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rule</span><span>{finding.rule?.name || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Detected</span><span>{new Date(finding.createdAt).toLocaleString()}</span></div>
            {finding.resolvedAt && <div className="flex justify-between"><span className="text-muted-foreground">Resolved</span><span>{new Date(finding.resolvedAt).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Data Points</span><span>{finding.dataPoints.length}</span></div>
          </CardContent>
        </Card>

        {/* Status Update */}
        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
            <CardDescription>Change finding status and add notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="REMEDIATED">Remediated</SelectItem>
                <SelectItem value="ACCEPTED_RISK">Accepted Risk</SelectItem>
                <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Resolution notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <Button className="w-full" onClick={handleUpdateStatus} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Finding
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {finding.aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{finding.aiAnalysis}</div>
          </CardContent>
        </Card>
      )}

      {/* Remediation Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Remediation Plan</CardTitle>
          <CardDescription>
            {finding.remediationPlan ? `Status: ${finding.remediationPlan.status}` : "Generate an AI-powered remediation plan"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {finding.remediationPlan?.aiResponse || remediationText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {remediationText || finding.remediationPlan?.aiResponse}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No remediation plan generated yet.</p>
          )}
          <Button variant="outline" onClick={handleGenerateRemediation} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            {finding.remediationPlan ? "Regenerate Plan" : "Generate Remediation Plan"}
          </Button>
        </CardContent>
      </Card>

      {/* Data Points */}
      {finding.dataPoints.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Related Data Points</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finding.dataPoints.map((dp, i) => (
                <div key={i} className="rounded border p-3 text-xs">
                  <div className="flex gap-2 mb-1">
                    <Badge variant="outline">{dp.dataPoint.domain}</Badge>
                    <Badge variant="secondary">{dp.dataPoint.dataType}</Badge>
                  </div>
                  <pre className="overflow-x-auto text-muted-foreground">{JSON.stringify(dp.dataPoint.data, null, 2)}</pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
