import Link from "next/link";

export function AffiliateDisclosure() {
  return (
    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground mb-6">
      Disclosure: This page contains affiliate links. We may earn a commission
      if you make a purchase, at no extra cost to you.{" "}
      <Link href="/disclosure" className="underline">
        Learn more
      </Link>
      .
    </div>
  );
}
