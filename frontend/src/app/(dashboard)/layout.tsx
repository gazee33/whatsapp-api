"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { TenantSidebar } from "@/components/layouts/tenant-sidebar";
import { TenantHeader } from "@/components/layouts/tenant-header";
import { useEffect } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { connectSocket, disconnectSocket } from "@/lib/socket";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard type="tenant">
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { fetchBusiness, fetchSettings, business } = useBusinessStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchBusiness();
    fetchSettings();
  }, [fetchBusiness, fetchSettings]);

  useEffect(() => {
    if (business?.id) {
      connectSocket(business.id);
      return () => {
        disconnectSocket();
      };
    }
  }, [business?.id]);

  return (
    <div className="flex h-full min-h-screen">
      <TenantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col lg:ml-[260px] transition-all duration-300">
        <TenantHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
