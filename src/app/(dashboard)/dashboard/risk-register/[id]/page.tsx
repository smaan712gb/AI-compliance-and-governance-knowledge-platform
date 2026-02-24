export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getRiskScoreColor, getRiskScoreLabel } from "@/lib/constants/risk-register-data";
import { RiskAnalyzeButton } from "./analyze-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RiskDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
  if (!company) redirect("/dashboard");

  const risk = await db.risk.findFirst({
    where: { id, companyId: company.id },
    include: { assessments: { orderBy: { createdAt: "desc" } } },
  });
  if (!risk) notFound();

  const score = risk.inherentScore || risk.likelihood * risk.impact;
  const color = getRiskScoreColor(score);
  const label = getRiskScoreLabel(score);

  const SCORE_BADGE: Record<string, "destructive" | "secondary" | "outline"> = {
    red: "destructive", orange: "destructive", yellow: "secondary", green: "outline",
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/risk-register"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            {risk.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={SCORE_BADGE[color] || "secondary"}>{label} ({score})</Badge>
            <Badge variant="outline">{risk.status}</Badge>
            <Badge variant="outline">{risk.category.replace(/_/g, " ")}</Badge>
          </div>
        </div>
        <RiskAnalyzeButton riskId={risk.id} hasAssessments={risk.assessments.length > 0} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Risk Description</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{risk.description}</p></CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Risk Scoring</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Likelihood: <strong>{risk.likelihood}/5</strong></div>
              <div>Impact: <strong>{risk.impact}/5</strong></div>
              <div>Inherent Score: <strong>{score}/25</strong></div>
              {risk.residualScore && <div>Residual Score: <strong>{risk.residualScore}/25</strong></div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Management</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {risk.owner && <div>Owner: <strong>{risk.owner}</strong></div>}
              {risk.targetDate && <div>Target Date: <strong>{new Date(risk.targetDate).toLocaleDateString()}</strong></div>}
              {risk.reviewDate && <div>Last Review: <strong>{new Date(risk.reviewDate).toLocaleDateString()}</strong></div>}
              <div>Created: {new Date(risk.createdAt).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        </div>

        {risk.mitigations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Current Mitigations</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {risk.mitigations.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {risk.assessments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">AI Risk Assessments ({risk.assessments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {risk.assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{new Date(assessment.createdAt).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{assessment.tokensUsed} tokens · ${assessment.costUsd.toFixed(4)}</span>
                  </div>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(assessment.analysis, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
