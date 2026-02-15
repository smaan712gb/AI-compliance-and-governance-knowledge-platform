import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardContent className="pt-8 text-center">
          <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Checkout Cancelled</h1>
          <p className="mt-3 text-muted-foreground">
            Your payment was not processed. No charges were made.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/products">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Products
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
