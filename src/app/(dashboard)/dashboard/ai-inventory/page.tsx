export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Brain, AlertTriangle } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  UNACCEPTABLE: "bg-red-500",
  HIGH: "bg-orange-500",
  LIMITED: "bg-yellow-500",
  MINIMAL: "bg-green-500",
  GPAI: "bg-blue-500",
  GPAI_SYSTEMIC: "bg-purple-500",
};

export default async function AIInventoryDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });

  const systems = company
    ? await db.aISystem.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const riskCounts = systems.reduce(
    (acc, s) => {
      const level = s.riskLevel || "UNCLASSIFIED";
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI System Inventory
          </h1>
          <p className="text-muted-foreground">
            {systems.length} system{systems.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link href="/dashboard/ai-inventory/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Register AI System
          </Button>
        </Link>
      </div>

      {/* Risk Distribution */}
      {systems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(riskCounts).map(([level, count]) => (
            <Card key={level}>
              <CardContent className="py-4 text-center">
                <div className={`h-3 w-3 rounded-full ${RISK_COLORS[level] || "bg-gray-400"} mx-auto mb-2`} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {level.replace(/_/g, " ").toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Systems List */}
      {systems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Systems Registered</h3>
            <p className="text-muted-foreground mb-4">
              Start building your AI system inventory for EU AI Act compliance.
            </p>
            <Link href="/dashboard/ai-inventory/new">
              <Button>Register First AI System</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {systems.map((system) => (
            <Link key={system.id} href={`/dashboard/ai-inventory/${system.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{system.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {system.riskLevel && (
                        <Badge variant={system.riskLevel === "HIGH" || system.riskLevel === "UNACCEPTABLE" ? "destructive" : "secondary"}>
                          {system.riskLevel.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <Badge variant="outline">{system.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{system.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {system.modelType && <span>Model: {system.modelType}</span>}
                    {system.department && <span>Dept: {system.department}</span>}
                    {!system.aiAnalysis && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        Not analyzed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
