"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserNav } from "@/components/layout/user-nav";
import {
  Shield,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

const toolLinks = [
  {
    title: "AI Act Compliance Checker",
    href: "/ai-act-checker",
    description: "Check your AI system's EU AI Act obligations",
  },
  {
    title: "ERP Compliance Gap Analysis",
    href: "/erp-analysis",
    description: "Identify regulatory gaps in your ERP system",
  },
  {
    title: "Vendor Risk Questionnaire",
    href: "/vendor-risk-questionnaire",
    description: "Generate AI vendor due diligence questionnaires",
  },
  {
    title: "Policy-to-Control Mapping",
    href: "/policy-mapper",
    description: "Map policies to NIST, ISO 27001, SOC 2, PCI DSS controls",
  },
  {
    title: "Incident Materiality Assessment",
    href: "/incident-assessment",
    description: "SEC 8-K materiality analysis and breach notification",
  },
  {
    title: "Board Report Generator",
    href: "/board-report",
    description: "Generate board-ready cyber and compliance reports",
  },
  {
    title: "AI System Inventory",
    href: "/ai-inventory",
    description: "EU AI Act model risk registry and compliance tracking",
  },
  {
    title: "Privacy Operations Toolkit",
    href: "/privacy-ops",
    description: "DSAR responses, ROPA generation, DPA review",
  },
  {
    title: "HR Compliance Checker",
    href: "/hr-compliance-checker",
    description: "AI hiring, pay transparency, and employment law compliance",
  },
  {
    title: "Financial Compliance Checker",
    href: "/financial-compliance-checker",
    description: "AML/KYC, transaction monitoring, sanctions screening, and SOX compliance",
  },
  {
    title: "HIPAA Compliance Checker",
    href: "/hipaa-compliance-checker",
    description: "PHI safeguards, breach notification, BAA management, and OCR audit readiness",
  },
  {
    title: "PCI DSS Compliance Checker",
    href: "/pci-compliance-checker",
    description: "Payment card security, SAQ assessment, and PCI DSS v4.0.1 requirements",
  },
];

const resourceLinks = [
  { title: "Blog", href: "/blog", description: "Compliance insights and regulatory updates" },
  { title: "Guides", href: "/guides", description: "In-depth compliance guides" },
  { title: "Jurisdictions", href: "/jurisdictions", description: "Regulatory landscape by country" },
  { title: "Best Tools", href: "/best", description: "Curated tool comparisons" },
];

export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">AIGovHub</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {/* Tools Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("tools")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span>Tools</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {activeDropdown === "tools" && (
              <div className="absolute left-0 top-full mt-0 w-80 max-h-[70vh] overflow-y-auto rounded-md border bg-popover p-4 shadow-md">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md p-3 hover:bg-accent transition-colors"
                  >
                    <div className="text-sm font-medium">{link.title}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/vendors"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Vendor Tracker
          </Link>

          {/* Resources Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("resources")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span>Resources</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {activeDropdown === "resources" && (
              <div className="absolute left-0 top-full mt-0 w-64 rounded-md border bg-popover p-4 shadow-md">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md p-3 hover:bg-accent transition-colors"
                  >
                    <div className="text-sm font-medium">{link.title}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/ccm"
            className="px-3 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            CCM Platform
          </Link>

          <Link
            href="/sentinel"
            className="px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
          >
            Sentinel
          </Link>

          <Link
            href="/products"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Products
          </Link>

          <Link
            href="/pricing"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {session ? (
            <UserNav user={session.user} />
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <MobileNav onClose={() => setMobileMenuOpen(false)} />
      )}
    </header>
  );
}
