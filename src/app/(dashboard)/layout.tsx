export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  LayoutDashboard,
  CreditCard,
  Star,
  FileCheck,
  Settings,
} from "lucide-react";

const dashboardItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Purchases",
    href: "/dashboard/purchases",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    title: "Subscription",
    href: "/dashboard/subscription",
    icon: <Star className="h-4 w-4" />,
  },
  {
    title: "Saved Results",
    href: "/dashboard/saved-results",
    icon: <FileCheck className="h-4 w-4" />,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar items={dashboardItems} title="Dashboard" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
