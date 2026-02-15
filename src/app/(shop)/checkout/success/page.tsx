import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ArrowRight } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardContent className="pt-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="mt-3 text-muted-foreground">
            Thank you for your purchase. You can download your files from your
            dashboard.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/dashboard/purchases">
              <Button className="w-full gap-2">
                <Download className="h-4 w-4" />
                Go to Downloads
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full gap-2">
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            A confirmation email has been sent to your registered email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
