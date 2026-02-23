import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AlertsLoading() {
  return (
    <div className="max-w-4xl animate-pulse">
      <div className="h-8 bg-muted rounded w-48 mb-2" />
      <div className="h-4 bg-muted rounded w-80 mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-muted rounded w-20" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
