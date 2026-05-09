"use client";

import { usePathname } from "next/navigation";
import { Sparkles, Languages } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/i18n/language-context";

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const isRtl = lang === "ar";

  const steps = [
    { key: "onboarding.step_1", active: pathname === "/login" || pathname === "/register" },
    { key: "onboarding.step_2", active: false },
    { key: "onboarding.step_3", active: false },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FAF5FF] via-[#EEF2FF] to-[#E0E7FF] px-4 py-8">
      {/* Decorative blur orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#6366F1] opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#06B6D4] opacity-[0.04] blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[250px] h-[250px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-slate-700 hover:bg-indigo-50 transition-colors cursor-pointer text-sm"
          >
            <Languages className="w-4 h-4" />
            <span className="text-xs font-bold">
              {lang === "en" ? "العربية" : "English"}
            </span>
          </button>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-200">
            <Sparkles className="h-7 w-7 text-indigo-500" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight font-[family-name:var(--font-playfair)]">
            <span className="bg-gradient-to-r from-[#6366F1] to-[#06B6D4] bg-clip-text text-transparent">
              Nadil AI
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            WhatsApp AI Agent — Powered Ordering
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-100/40 bg-white/70 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="rounded-xl bg-white/90 p-6 shadow-inner">
            {children}

            {/* Onboarding Steps Indicator */}
            <div
              className={`mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              {steps.map((step, i) => (
                <span key={step.key} className="flex items-center gap-2">
                  <span
                    className={
                      step.active
                        ? "text-indigo-500 font-medium"
                        : "text-slate-400"
                    }
                  >
                    {t(step.key)}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="text-slate-300">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Nadil AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </LanguageProvider>
  );
}
