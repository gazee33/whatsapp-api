"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LanguageProvider } from "@/i18n/language-context";

function OnboardingLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#FAF5FF] via-[#EEF2FF] to-[#E0E7FF]">
      {/* Decorative blur orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#6366F1] opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#06B6D4] opacity-[0.04] blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[250px] h-[250px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[80px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-100/40 bg-white/40 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-playfair)] bg-gradient-to-r from-[#6366F1] to-[#06B6D4] bg-clip-text text-transparent">
            Nadil AI
          </span>
        </Link>

        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>

      {/* Centered content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <OnboardingLayoutInner>{children}</OnboardingLayoutInner>
    </LanguageProvider>
  );
}
