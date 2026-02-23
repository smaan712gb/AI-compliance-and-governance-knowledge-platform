import { Card, CardContent } from "@/components/ui/card";

export default function JurisdictionsLoading() {
  return (
    <div className="container mx-auto px-4 py-12 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-8 bg-muted rounded w-64 mx-auto mb-2" />
        <div className="h-4 bg-muted rounded w-96 mx-auto" />
      </div>
      <div className="space-y-8">
        {[1, 2, 3].map((r) => (
          <div key={r}>
            <div className="h-6 bg-muted rounded w-32 mb-4" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((c) => (
                <Card key={c}>
                  <CardContent className="pt-4">
                    <div className="h-5 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
