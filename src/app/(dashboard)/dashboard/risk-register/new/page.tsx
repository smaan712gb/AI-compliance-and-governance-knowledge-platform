"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RISK_CATEGORIES, LIKELIHOOD_SCALE, IMPACT_SCALE, RISK_STATUSES } from "@/lib/constants/risk-register-data";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewRiskPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [targetDate, setTargetDate] = useState("");
  const [mitigations, setMitigations] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/dashboard/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, category, likelihood, impact,
          owner: owner || undefined,
          status,
          targetDate: targetDate || undefined,
          mitigations: mitigations ? mitigations.split("\n").filter(Boolean) : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || `Status ${res.status}`); }
      const { data } = await res.json();
      router.push(`/dashboard/risk-register/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create risk");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/risk-register"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Add Risk</h1>
      </div>

      {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Risk Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Risk Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Ransomware attack on production systems" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Description <span className="text-destructive">*</span></Label>
              <Textarea placeholder="Describe the risk scenario, threat actors, and potential business impact..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div>
              <Label className="mb-2 block">Category <span className="text-destructive">*</span></Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select category...</option>
                {RISK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Risk Scoring</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Likelihood ({likelihood}/5)</Label>
              <input type="range" min="1" max="5" value={likelihood} onChange={(e) => setLikelihood(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {LIKELIHOOD_SCALE.map((l) => <span key={l.value}>{l.label}</span>)}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Impact ({impact}/5)</Label>
              <input type="range" min="1" max="5" value={impact} onChange={(e) => setImpact(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {IMPACT_SCALE.map((i) => <span key={i.value}>{i.label}</span>)}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Inherent Risk Score: </span>
              <span className="text-lg font-bold">{likelihood * impact}</span>
              <span className="text-sm text-muted-foreground"> / 25</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Risk Owner</Label>
                <Input placeholder="e.g., CISO, VP Engineering" value={owner} onChange={(e) => setOwner(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block">Status</Label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {RISK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Target Resolution Date</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Current Mitigations (one per line)</Label>
              <Textarea placeholder="Describe existing mitigations..." value={mitigations} onChange={(e) => setMitigations(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={isSubmitting || !title || description.length < 10 || !category} className="w-full">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding Risk...</> : "Add Risk to Register"}
        </Button>
      </div>
    </div>
  );
}
