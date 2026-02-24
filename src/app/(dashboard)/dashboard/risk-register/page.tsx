export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, ShieldAlert } from "lucide-react";
import { getRiskScoreColor, getRiskScoreLabel } from "@/lib/constants/risk-register-data";

export default async function RiskRegisterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
  const risks = company
    ? await db.risk.findMany({
        where: { companyId: company.id },
        orderBy: [{ status: "asc" }, { inherentScore: "desc" }],
      })
    : [];

  const openRisks = risks.filter((r) => r.status !== "CLOSED");
  const criticalCount = risks.filter((r) => (r.inherentScore || 0) >= 20).length;
  const highCount = risks.filter((r) => (r.inherentScore || 0) >= 12 && (r.inherentScore || 0) < 20).length;

  const SCORE_BADGE: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    red: "destructive",
    orange: "destructive",
    yellow: "secondary",
    green: "outline",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Enterprise Risk Register
          </h1>
          <p className="text-muted-foreground">
            {openRisks.length} open risk{openRisks.length !== 1 ? "s" : ""}
            {criticalCount > 0 && ` · ${criticalCount} critical`}
            {highCount > 0 && ` · ${highCount} high`}
          </p>
        </div>
        <Link href="/dashboard/risk-register/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Add Risk</Button>
        </Link>
      </div>

      {risks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Risks Registered</h3>
            <p className="text-muted-foreground mb-4">Start building your enterprise risk register.</p>
            <Link href="/dashboard/risk-register/new"><Button>Add First Risk</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => {
            const score = risk.inherentScore || risk.likelihood * risk.impact;
            const color = getRiskScoreColor(score);
            const label = getRiskScoreLabel(score);
            return (
              <Link key={risk.id} href={`/dashboard/risk-register/${risk.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{risk.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={SCORE_BADGE[color] || "secondary"}>
                          {label} ({score})
                        </Badge>
                        <Badge variant="outline">{risk.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{risk.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{risk.category.replace(/_/g, " ")}</span>
                      <span>L:{risk.likelihood} × I:{risk.impact}</span>
                      {risk.owner && <span>Owner: {risk.owner}</span>}
                      {risk.residualScore && <span>Residual: {risk.residualScore}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
