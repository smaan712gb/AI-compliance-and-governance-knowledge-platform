"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  onClose: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const { data: session } = useSession();

  const links = [
    { title: "AI Act Checker", href: "/ai-act-checker" },
    { title: "Questionnaire Generator", href: "/vendor-risk-questionnaire" },
    { title: "Vendor Tracker", href: "/vendors" },
    { title: "Blog", href: "/blog" },
    { title: "Guides", href: "/guides" },
    { title: "Products", href: "/products" },
    { title: "Pricing", href: "/pricing" },
  ];

  return (
    <div className="md:hidden border-t bg-background">
      <nav className="container mx-auto px-4 py-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {link.title}
          </Link>
        ))}
        <div className="pt-4 border-t space-y-2">
          {session ? (
            <>
              <Link href="/dashboard" onClick={onClose}>
                <Button variant="outline" className="w-full" size="sm">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" className="w-full" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={onClose}>
                <Button className="w-full" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
