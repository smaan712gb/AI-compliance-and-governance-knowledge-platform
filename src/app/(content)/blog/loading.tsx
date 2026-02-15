import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function BlogLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <Skeleton className="h-9 w-56 mx-auto" />
        <Skeleton className="h-5 w-80 mx-auto mt-3" />
      </div>

      {/* Blog card grid - matches md:grid-cols-2 lg:grid-cols-3 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            {/* Featured image placeholder */}
            <Skeleton className="w-full h-48 rounded-t-lg" />
            <CardContent className="pt-4">
              {/* Tag badges */}
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>

              {/* Title */}
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-5 w-3/4" />

              {/* Excerpt */}
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-2/3 mt-1" />

              {/* Date */}
              <Skeleton className="h-3 w-24 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
