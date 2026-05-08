"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { PlatformSidebar } from "@/components/layouts/platform-sidebar";
import { PlatformHeader } from "@/components/layouts/platform-header";
import { LanguageProvider } from "@/i18n/language-context";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AuthGuard type="platform">
        <PlatformContent>{children}</PlatformContent>
      </AuthGuard>
    </LanguageProvider>
  );
}

function PlatformContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen">
      <PlatformSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col lg:ms-[260px]">
        <PlatformHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
