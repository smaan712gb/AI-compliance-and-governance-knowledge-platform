import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export default async function AdminSubscribersPage() {
  const [subscribers, totalActive, totalUnsubscribed] = await Promise.all([
    db.subscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      take: 50,
    }),
    db.subscriber.count({ where: { status: "ACTIVE" } }),
    db.subscriber.count({ where: { status: "UNSUBSCRIBED" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Subscribers</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle>Total Subscribers</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{subscribers.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{totalActive}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Unsubscribed</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-muted-foreground">{totalUnsubscribed}</p></CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Tags</th>
              <th className="text-left p-3 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id} className="border-b">
                <td className="p-3 font-medium">{sub.email}</td>
                <td className="p-3 text-muted-foreground">{sub.name || "\u2014"}</td>
                <td className="p-3 text-sm text-muted-foreground">{sub.source || "\u2014"}</td>
                <td className="p-3">
                  <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>
                    {sub.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {sub.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{formatDate(sub.subscribedAt)}</td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">No subscribers yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
