"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_TYPES, MODEL_PROVIDERS, DATA_SENSITIVITY_LEVELS, AI_RISK_LEVELS, AFFECTED_PERSON_TYPES } from "@/lib/constants/ai-system-data";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAISystemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelProvider, setModelProvider] = useState("");
  const [dataClassification, setDataClassification] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");
  const [deploymentDate, setDeploymentDate] = useState("");
  const [affectedPersons, setAffectedPersons] = useState<string[]>([]);
  const [humanOversight, setHumanOversight] = useState("");

  const toggleAffected = (v: string) => {
    setAffectedPersons((prev) => prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/dashboard/ai-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description,
          purpose: purpose || undefined,
          modelType: modelType || undefined,
          modelProvider: modelProvider || undefined,
          dataClassification: dataClassification || undefined,
          riskLevel: riskLevel || undefined,
          department: department || undefined,
          owner: owner || undefined,
          deploymentDate: deploymentDate || undefined,
          affectedPersons: affectedPersons.length > 0 ? affectedPersons : undefined,
          humanOversight: humanOversight || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || `Status ${res.status}`);
      }
      const { data } = await res.json();
      router.push(`/dashboard/ai-inventory/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create AI system");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/ai-inventory">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Register AI System</h1>
      </div>

      {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">{error}</div>}

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">System Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Customer Churn Prediction Model" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Description <span className="text-destructive">*</span></Label>
              <Textarea placeholder="What does this AI system do?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">Purpose</Label>
              <Textarea placeholder="Why was this system deployed? What business problem does it solve?" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Technical Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Model Type</Label>
                <select value={modelType} onChange={(e) => setModelType(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {MODEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Model Provider</Label>
                <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {MODEL_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Data Sensitivity</Label>
                <select value={dataClassification} onChange={(e) => setDataClassification(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {DATA_SENSITIVITY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">Risk Level (EU AI Act)</Label>
                <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select or leave for AI analysis...</option>
                  {AI_RISK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Governance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Department</Label>
                <Input placeholder="e.g., Marketing, Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block">System Owner</Label>
                <Input placeholder="e.g., Jane Smith, VP Engineering" value={owner} onChange={(e) => setOwner(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Deployment Date</Label>
              <Input type="date" value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Affected Persons</Label>
              <div className="flex flex-wrap gap-2">
                {AFFECTED_PERSON_TYPES.map((ap) => (
                  <button key={ap.value} type="button" onClick={() => toggleAffected(ap.value)}
                    className={`text-sm px-3 py-1.5 rounded-md border ${affectedPersons.includes(ap.value) ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/50"}`}>
                    {ap.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Human Oversight Measures</Label>
              <Textarea placeholder="Describe how humans oversee this AI system's decisions..." value={humanOversight} onChange={(e) => setHumanOversight(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={isSubmitting || !name || description.length < 10} className="w-full">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...</> : "Register AI System"}
        </Button>
      </div>
    </div>
  );
}
