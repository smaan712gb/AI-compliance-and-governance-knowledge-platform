"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, Settings, CreditCard, LogOut, LayoutDashboard } from "lucide-react";

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 rounded-full border p-1 pr-3 hover:bg-accent transition-colors"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || ""}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
          </div>
        )}
        <span className="text-sm font-medium hidden lg:block">
          {user.name || user.email?.split("@")[0]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-md">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center space-x-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/purchases"
              onClick={() => setOpen(false)}
              className="flex items-center space-x-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span>Purchases</span>
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center space-x-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center space-x-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>
          <div className="border-t p-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center space-x-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
