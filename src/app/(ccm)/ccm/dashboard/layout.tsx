export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { CCMSidebar } from "@/components/ccm/ccm-sidebar";

export default function CCMDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <CCMSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
