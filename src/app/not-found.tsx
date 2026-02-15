import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button className="mt-8">Back to Homepage</Button>
        </Link>
      </div>
    </div>
  );
}
