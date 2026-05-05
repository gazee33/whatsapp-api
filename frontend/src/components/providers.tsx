"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { initApiClients } from "@/lib/api-client";

function ThemeWatcher() {
  const { setTheme } = useTheme();
  /* eslint-disable react-hooks/set-state-in-effect */
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      setTheme(systemTheme);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setTheme, mounted]);

  return null;
}

function ApiClientInitializer() {
  useEffect(() => {
    initApiClients();
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeWatcher />
      <ApiClientInitializer />
      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm font-medium",
          style: {
            background: "var(--toast-bg)",
            color: "var(--toast-fg)",
            border: "1px solid var(--border)",
          },
        }}
        closeButton
        richColors
      />
      {children}
    </ThemeProvider>
  );
}
