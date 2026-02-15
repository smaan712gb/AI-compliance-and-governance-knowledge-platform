import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { Download, Package } from "lucide-react";
import Link from "next/link";

export default async function PurchasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const purchases = await db.purchase.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Purchases</h1>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">No purchases yet</h2>
            <p className="text-muted-foreground mt-2">
              Browse our compliance toolkits and templates.
            </p>
            <Link href="/products">
              <Button className="mt-4">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{purchase.product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Purchased {formatDate(purchase.createdAt)} &middot;{" "}
                      {formatCurrency(purchase.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success">Completed</Badge>
                  {purchase.product.fileUrl && (
                    <a href={`/api/products/${purchase.product.id}/download`}>
                      <Button size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
