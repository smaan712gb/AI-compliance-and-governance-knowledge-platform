import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export default async function AdminAffiliatesPage() {
  const [links, recentClicks, totalClicks] = await Promise.all([
    db.affiliateLink.findMany({
      include: { vendor: { select: { name: true } }, _count: { select: { clicks: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.affiliateClick.findMany({
      include: { affiliateLink: { include: { vendor: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.affiliateClick.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Affiliate Management</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle>Total Links</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{links.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Clicks</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalClicks}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Affiliate Links</h2>
      <div className="rounded-md border mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium">Tracking Code</th>
              <th className="text-left p-3 font-medium">Clicks</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-b">
                <td className="p-3 font-medium">{link.vendor?.name || "N/A"}</td>
                <td className="p-3 text-sm text-muted-foreground">/go/{link.trackingCode}</td>
                <td className="p-3">{link._count.clicks}</td>
                <td className="p-3">
                  <Badge variant={link.isActive ? "default" : "secondary"}>
                    {link.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">No affiliate links yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mb-4">Recent Clicks</h2>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Referrer</th>
            </tr>
          </thead>
          <tbody>
            {recentClicks.map((click) => (
              <tr key={click.id} className="border-b">
                <td className="p-3">{click.affiliateLink.vendor?.name || "N/A"}</td>
                <td className="p-3 text-sm text-muted-foreground">{formatDate(click.createdAt)}</td>
                <td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{click.referrerUrl || "Direct"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
