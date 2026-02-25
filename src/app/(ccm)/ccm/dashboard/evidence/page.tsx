"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileArchive, Plus, Loader2 } from "lucide-react";

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  collectedAt: string;
  finding: { id: string; title: string; severity: string } | null;
}

const EVIDENCE_TYPES = [
  "SCREENSHOT", "LOG_EXPORT", "CONFIGURATION", "POLICY_DOCUMENT",
  "TEST_RESULT", "SYSTEM_REPORT", "AUTO_COLLECTED",
];

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "LOG_EXPORT", description: "", fileUrl: "" });

  useEffect(() => {
    fetch("/api/ccm/evidence?limit=50")
      .then((r) => r.json())
      .then((res) => {
        setEvidence(res.data || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/ccm/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          description: form.description || undefined,
          fileUrl: form.fileUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEvidence((prev) => [data.data, ...prev]);
        setTotal((t) => t + 1);
        setDialogOpen(false);
        setForm({ title: "", type: "LOG_EXPORT", description: "", fileUrl: "" });
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evidence Library</h1>
          <p className="text-muted-foreground">{total} evidence items collected</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Evidence</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Evidence</DialogTitle>
              <DialogDescription>Upload or link compliance evidence</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Evidence title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((t) => (<SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>File URL (optional)</Label>
                <Input placeholder="https://..." value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving || !form.title}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Evidence
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : evidence.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <FileArchive className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Evidence Yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Collect and organize audit evidence for compliance reviews.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {evidence.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate">{item.title}</CardTitle>
                  <Badge variant="outline">{item.type.replace(/_/g, " ")}</Badge>
                </div>
                {item.description && <CardDescription className="truncate">{item.description}</CardDescription>}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Collected: {new Date(item.collectedAt).toLocaleDateString()}</p>
                {item.finding && (
                  <p>Finding: <span className="font-medium">{item.finding.title}</span></p>
                )}
                {item.fileUrl && (
                  <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View File
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
