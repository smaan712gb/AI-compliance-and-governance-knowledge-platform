import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { FileCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const riskColors: Record<string, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  unacceptable: "destructive",
  high: "destructive",
  gpai: "warning",
  limited: "secondary",
  minimal: "success",
};

export default async function SavedResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const results = await db.savedComplianceResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Saved Compliance Results</h1>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">No saved results</h2>
            <p className="text-muted-foreground mt-2">
              Run a compliance check to save your first assessment.
            </p>
            <Link href="/ai-act-checker/wizard">
              <Button className="mt-4">Run Compliance Check</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold capitalize">
                      {result.systemType.replace(/_/g, " ")}
                    </h3>
                    <Badge variant={riskColors[result.riskLevel] || "default"}>
                      {result.riskLevel} risk
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Role: {result.role} &middot;{" "}
                    {formatDate(result.createdAt)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {result.useCase}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
