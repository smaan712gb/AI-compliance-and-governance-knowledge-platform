import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  Users,
  FileText,
  Building2,
  Package,
  MousePointerClick,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

export default async function AdminDashboardPage() {
  const [
    totalRevenue,
    subscriberCount,
    vendorCount,
    contentCount,
    productCount,
    affiliateClicks,
    recentPurchases,
  ] = await Promise.all([
    db.purchase
      .aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      })
      .then((r) => r._sum.amount || 0),
    db.subscriber.count({ where: { status: "ACTIVE" } }),
    db.vendor.count(),
    db.contentPage.count(),
    db.digitalProduct.count({ where: { isActive: true } }),
    db.affiliateClick.count(),
    db.purchase.findMany({
      where: { status: "COMPLETED" },
      include: { user: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
    },
    {
      title: "Subscribers",
      value: formatNumber(subscriberCount),
      icon: Users,
    },
    {
      title: "Vendors",
      value: formatNumber(vendorCount),
      icon: Building2,
    },
    {
      title: "Content Pages",
      value: formatNumber(contentCount),
      icon: FileText,
    },
    {
      title: "Products",
      value: formatNumber(productCount),
      icon: Package,
    },
    {
      title: "Affiliate Clicks",
      value: formatNumber(affiliateClicks),
      icon: MousePointerClick,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Purchases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPurchases.length === 0 ? (
            <p className="text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Customer</th>
                    <th className="text-left py-2 font-medium">Product</th>
                    <th className="text-left py-2 font-medium">Amount</th>
                    <th className="text-left py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b last:border-0">
                      <td className="py-2">
                        {purchase.user.name || purchase.user.email}
                      </td>
                      <td className="py-2">{purchase.product.name}</td>
                      <td className="py-2">
                        {formatCurrency(purchase.amount)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
