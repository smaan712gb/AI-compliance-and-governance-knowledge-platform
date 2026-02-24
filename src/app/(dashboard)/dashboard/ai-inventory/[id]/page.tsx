export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Brain, Shield } from "lucide-react";
import { AIAnalyzeButton } from "./analyze-button";

interface Props {
  params: Promise<{ id: string }>;
}

const RISK_BADGE_VARIANT: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  UNACCEPTABLE: "destructive",
  HIGH: "destructive",
  LIMITED: "secondary",
  MINIMAL: "outline",
  GPAI: "default",
  GPAI_SYSTEMIC: "destructive",
};

export default async function AISystemDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
  if (!company) redirect("/dashboard");

  const system = await db.aISystem.findFirst({ where: { id, companyId: company.id } });
  if (!system) notFound();

  const analysis = system.aiAnalysis as Record<string, unknown> | null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/ai-inventory">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            {system.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {system.riskLevel && (
              <Badge variant={RISK_BADGE_VARIANT[system.riskLevel] || "secondary"}>
                {system.riskLevel.replace(/_/g, " ")}
              </Badge>
            )}
            <Badge variant="outline">{system.status}</Badge>
          </div>
        </div>
        <AIAnalyzeButton systemId={system.id} hasAnalysis={!!analysis} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Overview</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{system.description}</p>
            {system.purpose && (
              <div className="mt-4">
                <h4 className="font-medium mb-1">Purpose</h4>
                <p className="text-sm text-muted-foreground">{system.purpose}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Technical Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {system.modelType && <div><span className="text-muted-foreground">Model Type:</span> {system.modelType}</div>}
              {system.modelProvider && <div><span className="text-muted-foreground">Provider:</span> {system.modelProvider}</div>}
              {system.dataClassification && <div><span className="text-muted-foreground">Data Sensitivity:</span> {system.dataClassification}</div>}
              {system.deploymentDate && <div><span className="text-muted-foreground">Deployed:</span> {new Date(system.deploymentDate).toLocaleDateString()}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Governance</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {system.department && <div><span className="text-muted-foreground">Department:</span> {system.department}</div>}
              {system.owner && <div><span className="text-muted-foreground">Owner:</span> {system.owner}</div>}
              {system.affectedPersons.length > 0 && <div><span className="text-muted-foreground">Affected:</span> {system.affectedPersons.join(", ")}</div>}
              {system.lastReviewDate && <div><span className="text-muted-foreground">Last Review:</span> {new Date(system.lastReviewDate).toLocaleDateString()}</div>}
            </CardContent>
          </Card>
        </div>

        {system.humanOversight && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Human Oversight</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{system.humanOversight}</p></CardContent>
          </Card>
        )}

        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AI Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
