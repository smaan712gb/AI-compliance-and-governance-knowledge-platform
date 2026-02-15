import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import {
  CreditCard,
  FileCheck,
  Star,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [purchases, subscription, savedResults] = await Promise.all([
    db.purchase.findMany({
      where: { userId: session.user.id, status: "COMPLETED" },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    db.savedComplianceResult.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Welcome back, {session.user.name?.split(" ")[0] || "there"}
      </h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
            <p className="text-xs text-muted-foreground">products purchased</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription?.status === "ACTIVE" ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Free</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription?.status === "ACTIVE"
                ? `Renews ${formatDate(subscription.stripeCurrentPeriodEnd)}`
                : "Upgrade for premium features"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saved Assessments
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedResults.length}</div>
            <p className="text-xs text-muted-foreground">
              compliance checks saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchases */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Purchases</CardTitle>
            <Link href="/dashboard/purchases">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No purchases yet.</p>
              <Link href="/products">
                <Button variant="link" className="mt-2">
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {purchase.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(purchase.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(purchase.amount)}
                    </p>
                    <Badge variant="success" className="text-xs">
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/ai-act-checker/wizard">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <FileCheck className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold">Run Compliance Check</h3>
                <p className="text-sm text-muted-foreground">
                  Check your AI system against the EU AI Act
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/vendor-risk-questionnaire">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <FileCheck className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold">Generate Questionnaire</h3>
                <p className="text-sm text-muted-foreground">
                  Create AI vendor risk questionnaires
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
