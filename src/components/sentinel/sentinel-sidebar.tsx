"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Globe,
  Globe2,
  ShieldAlert,
  BarChart3,
  Truck,
  Key,
  Settings,
  TrendingUp,
  LogOut,
  ChevronDown,
  Radar,
  Bell,
  LineChart,
  Eye,
  Brain,
  FolderOpen,
  FileText,
  Network,
} from "lucide-react";

const SENTINEL_NAV = [
  { title: "Overview", href: "/sentinel/dashboard", icon: LayoutDashboard },
  { title: "Globe View", href: "/sentinel/dashboard/globe", icon: Globe2 },
  { title: "Intelligence Feed", href: "/sentinel/dashboard/intelligence", icon: Globe },
  { title: "Entity Screening", href: "/sentinel/dashboard/screening", icon: ShieldAlert },
  { title: "Crisis Index", href: "/sentinel/dashboard/crisis-index", icon: BarChart3 },
  { title: "Supply Chain Risk", href: "/sentinel/dashboard/supply-chain", icon: Truck },
  { title: "Macro Market", href: "/sentinel/dashboard/macro-market", icon: LineChart },
  { title: "Cases", href: "/sentinel/dashboard/cases", icon: FolderOpen },
  { title: "Briefings", href: "/sentinel/dashboard/briefings", icon: FileText },
  { title: "Reasoning History", href: "/sentinel/dashboard/reasoning-history", icon: Brain },
  { title: "Watchlists", href: "/sentinel/dashboard/watchlists", icon: Eye },
  { title: "Knowledge Graph", href: "/sentinel/dashboard/graph", icon: Network },
  { title: "Alerts & Health", href: "/sentinel/dashboard/alerts", icon: Bell },
  { title: "API Keys", href: "/sentinel/dashboard/api-keys", icon: Key },
  { title: "Settings", href: "/sentinel/dashboard/settings", icon: Settings },
];

const TIER_STYLES: Record<string, { label: string; class: string }> = {
  FREE: { label: "FREE", class: "bg-gray-600 text-white" },
  PRO: { label: "PRO", class: "bg-emerald-600 text-white" },
  EXPERT: { label: "EXPERT", class: "bg-purple-600 text-white" },
  STRATEGIC: { label: "STRATEGIC", class: "bg-amber-600 text-white" },
};

export function SentinelSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tier, setTier] = useState<string>("FREE");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sentinel/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.tier) setTier(data.data.tier);
      })
      .catch(() => {});
  }, []);

  const tierConfig = TIER_STYLES[tier] || TIER_STYLES.FREE;
  const user = session?.user;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background h-screen sticky top-0">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Radar className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-emerald-600">
            Sentinel
          </h2>
          <span
            className={`ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${tierConfig.class}`}
          >
            {tierConfig.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Geopolitical Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {SENTINEL_NAV.map(({ title, href, icon: Icon }) => {
          const active =
            href === "/sentinel/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade nudge — FREE tier only */}
      {tier === "FREE" && (
        <div className="mx-3 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Upgrade to Pro
            </span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">
            API access, bias auditing, 5,000 requests/day
          </p>
          <Link href="/sentinel/pricing">
            <span className="block w-full text-center text-xs font-medium bg-emerald-600 text-white rounded px-2 py-1 hover:bg-emerald-700 transition-colors">
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
            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
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
                href="/sentinel/dashboard/settings"
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
