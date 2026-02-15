export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  Link2,
  Users,
  BarChart3,
} from "lucide-react";

const adminItems = [
  {
    title: "Overview",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Vendors",
    href: "/admin/vendors",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: <Package className="h-4 w-4" />,
  },
  {
    title: "Affiliates",
    href: "/admin/affiliates",
    icon: <Link2 className="h-4 w-4" />,
  },
  {
    title: "Subscribers",
    href: "/admin/subscribers",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar items={adminItems} title="Admin" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
