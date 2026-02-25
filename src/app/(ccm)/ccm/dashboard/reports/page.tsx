"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Loader2,
  FileText,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

interface Report {
  id: string;
  reportType: string;
  title: string;
  createdAt?: string;
  generatedAt?: string;
}

interface GeneratedReport {
  id: string;
  reportType: string;
  title: string;
  narrative: string;
  generatedAt: string;
  data: {
    findings?: { total: number; bySeverity?: Record<string, number> };
    monitoring?: { activeRules: number };
    period?: { from: string; to: string };
  };
}

const REPORT_TYPES = [
  { value: "SOX_COMPLIANCE", label: "SOX Compliance Report" },
  { value: "PCI_DSS_COMPLIANCE", label: "PCI DSS Compliance Report" },
  { value: "AML_BSA_COMPLIANCE", label: "AML/BSA Compliance Report" },
  { value: "ACCESS_REVIEW", label: "Access Review Report" },
  { value: "EXECUTIVE_SUMMARY", label: "Executive Summary" },
  { value: "CUSTOM", label: "Custom Report" },
];

function downloadMarkdown(report: GeneratedReport) {
  const md = `# ${report.title}\n\nGenerated: ${new Date(report.generatedAt).toLocaleString()}\nReport Type: ${report.reportType.replace(/_/g, " ")}\n\n---\n\n${report.narrative}`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}-${new Date(report.generatedAt).toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function NarrativePanel({ report }: { report: GeneratedReport }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(report.narrative).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-5 space-y-4">
      {/* Stats row */}
      {report.data?.findings && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg border bg-background px-3 py-2">
            <span className="text-muted-foreground">Total Findings: </span>
            <span className="font-semibold">{report.data.findings.total}</span>
          </div>
          {report.data.findings.bySeverity?.CRITICAL !== undefined && (
            <div className="rounded-lg border bg-background px-3 py-2">
              <span className="text-muted-foreground">Critical: </span>
              <span className="font-semibold text-red-600">
                {report.data.findings.bySeverity.CRITICAL}
              </span>
            </div>
          )}
          {report.data.monitoring?.activeRules !== undefined && (
            <div className="rounded-lg border bg-background px-3 py-2">
              <span className="text-muted-foreground">Active Rules: </span>
              <span className="font-semibold">
                {report.data.monitoring.activeRules}
              </span>
            </div>
          )}
          {report.data.period && (
            <div className="rounded-lg border bg-background px-3 py-2">
              <span className="text-muted-foreground">Period: </span>
              <span className="font-semibold">
                {new Date(report.data.period.from).toLocaleDateString()} –{" "}
                {new Date(report.data.period.to).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="mr-2 h-3 w-3 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-3 w-3" />
              Copy
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadMarkdown(report)}
        >
          <Download className="mr-2 h-3 w-3" />
          Export Markdown
        </Button>
      </div>

      {/* Narrative */}
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto rounded-lg border bg-background p-4">
        {report.narrative}
      </div>
    </div>
  );
}

function ReportListItem({ report }: { report: Report }) {
  const [expanded, setExpanded] = useState(false);
  const [fullReport, setFullReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadFull() {
    if (fullReport) {
      setExpanded((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ccm/reports/${report.id}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setFullReport(data.data);
        setExpanded(true);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }

  const date = report.createdAt || report.generatedAt;

  return (
    <Card>
      <CardContent className="py-0">
        <button
          onClick={loadFull}
          className="flex items-center justify-between w-full py-4 text-left"
          aria-expanded={expanded}
        >
          <div>
            <p className="font-medium">{report.title}</p>
            <p className="text-sm text-muted-foreground">
              {report.reportType.replace(/_/g, " ")} ·{" "}
              {date ? new Date(date).toLocaleDateString() : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>
        {expanded && fullReport && (
          <div className="pb-4">
            <NarrativePanel report={fullReport} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [selectedType, setSelectedType] = useState("EXECUTIVE_SUMMARY");
  const [generatedReport, setGeneratedReport] =
    useState<GeneratedReport | null>(null);

  useEffect(() => {
    fetch("/api/ccm/reports")
      .then((r) => r.json())
      .then((res) => setReports(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedReport(null);
    setGenerateError("");
    try {
      const res = await fetch("/api/ccm/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: selectedType }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const newReport: GeneratedReport = {
          id: data.data.id,
          reportType: data.data.reportType,
          title: data.data.title,
          narrative: data.data.narrative,
          generatedAt: data.data.generatedAt,
          data: data.data.data || {},
        };
        setGeneratedReport(newReport);
        setReports((prev) => [
          {
            id: newReport.id,
            reportType: newReport.reportType,
            title: newReport.title,
            createdAt: newReport.generatedAt,
          },
          ...prev,
        ]);
      } else {
        setGenerateError(data.error || "Failed to generate report");
      }
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Compliance Reports
        </h1>
        <p className="text-muted-foreground">
          AI-powered narrative compliance reports for auditors and leadership
        </p>
      </div>

      {/* ── Generator ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generate New Report
          </CardTitle>
          <CardDescription>
            Select a report type. The AI will analyze your findings, rules, and
            sync data to write a structured compliance narrative.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {generateError && (
            <p className="text-sm text-destructive">{generateError}</p>
          )}

          {generatedReport && (
            <NarrativePanel report={generatedReport} />
          )}
        </CardContent>
      </Card>

      {/* ── Report History ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Report History</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No reports generated yet. Use the form above to create your first
              compliance report.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
