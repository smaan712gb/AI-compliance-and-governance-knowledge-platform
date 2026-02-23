"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";

const DOMAINS = [
  { slug: "", label: "All" },
  { slug: "ai-governance", label: "AI Governance" },
  { slug: "e-invoicing", label: "E-Invoicing & Tax" },
  { slug: "tax-compliance", label: "Tax & SAF-T" },
  { slug: "cybersecurity", label: "Cybersecurity & SOC 2" },
  { slug: "data-privacy", label: "Data Privacy" },
  { slug: "esg", label: "ESG & Sustainability" },
  { slug: "fintech", label: "Fintech & AML" },
  { slug: "hr-compliance", label: "HR & Employment" },
] as const;

function DomainFilterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeDomain = searchParams.get("domain") ?? "";

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {DOMAINS.map((domain) => {
        const isActive = activeDomain === domain.slug;
        return (
          <button
            key={domain.slug}
            onClick={() => {
              const url = domain.slug ? `/blog?domain=${domain.slug}` : "/blog";
              router.push(url);
            }}
            className="focus:outline-none"
          >
            <Badge
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-primary hover:text-primary-foreground ${
                isActive ? "" : "hover:border-primary"
              }`}
            >
              {domain.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

export function BlogDomainFilter() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap gap-2 justify-center">
          {DOMAINS.map((domain) => (
            <Badge key={domain.slug} variant="outline" className="px-3 py-1.5 text-sm">
              {domain.label}
            </Badge>
          ))}
        </div>
      }
    >
      <DomainFilterInner />
    </Suspense>
  );
}

export { DOMAINS };
