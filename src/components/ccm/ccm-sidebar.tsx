"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Plug,
  BookOpen,
  AlertTriangle,
  FileArchive,
  BarChart3,
  Users,
  Settings,
  ScrollText,
  Brain,
  TrendingUp,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

const CCM_NAV = [
  { title: "Overview", href: "/ccm/dashboard", icon: LayoutDashboard },
  { title: "Connectors", href: "/ccm/dashboard/connectors", icon: Plug },
  { title: "Monitoring Rules", href: "/ccm/dashboard/rules", icon: BookOpen },
  { title: "Findings", href: "/ccm/dashboard/findings", icon: AlertTriangle },
  { title: "Evidence", href: "/ccm/dashboard/evidence", icon: FileArchive },
  { title: "Reports", href: "/ccm/dashboard/reports", icon: BarChart3 },
  { title: "Team", href: "/ccm/dashboard/team", icon: Users },
  { title: "Settings", href: "/ccm/dashboard/settings", icon: Settings },
  { title: "LLM Config", href: "/ccm/dashboard/settings/llm", icon: Brain },
  { title: "Audit Log", href: "/ccm/dashboard/audit-log", icon: ScrollText },
];

const TIER_STYLES: Record<string, { label: string; class: string }> = {
  starter: { label: "STARTER", class: "bg-blue-600 text-white" },
  professional: { label: "PRO", class: "bg-purple-600 text-white" },
  enterprise: { label: "ENT", class: "bg-amber-600 text-white" },
};

export function CCMSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ccm/organizations").then((r) => r.json()).catch(() => null),
      fetch("/api/ccm/subscription").then((r) => r.json()).catch(() => null),
    ]).then(([org, sub]) => {
      if (org?.data?.name) setOrgName(org.data.name);
      if (sub?.data?.tier && sub.data.tier !== "none") setTier(sub.data.tier);
    });
  }, []);

  const tierConfig = tier ? TIER_STYLES[tier] : null;
  const user = session?.user;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background h-screen sticky top-0">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-primary">
            CCM Platform
          </h2>
          {tierConfig && (
            <span
              className={`ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${tierConfig.class}`}
            >
              {tierConfig.label}
            </span>
          )}
        </div>
        {orgName && (
          <p className="text-xs text-muted-foreground truncate">{orgName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {CCM_NAV.map(({ title, href, icon: Icon }) => {
          const active =
            href === "/ccm/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade nudge — only show for Starter */}
      {tier === "starter" && (
        <div className="mx-3 mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-800">
              Upgrade to Pro
            </span>
          </div>
          <p className="text-xs text-purple-700 mb-2">
            3 connectors · PCI + AML · 500 AI analyses
          </p>
          <Link href="/ccm/dashboard/settings">
            <span className="block w-full text-center text-xs font-medium bg-purple-600 text-white rounded px-2 py-1 hover:bg-purple-700 transition-colors">
              View Plans
            </span>
          </Link>
        </div>
      )}

      {/* User menu */}
      {user && (
        <div className="border-t p-3 relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 w-full rounded-md px-2 py-2 hover:bg-accent transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate">
                {user.name || user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md border bg-popover shadow-md z-50">
              <Link
                href="/ccm/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Main Dashboard
              </Link>
              <div className="border-t" />
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
