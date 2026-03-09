export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { SentinelSidebar } from "@/components/sentinel/sentinel-sidebar";

export default function SentinelDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <SentinelSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
