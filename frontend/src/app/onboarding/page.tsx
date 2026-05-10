"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCheck,
  UtensilsCrossed,
  Terminal,
  Radio,
  Check,
  Info,
  ArrowRight,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { InlineSimulator } from "@/components/onboarding/inline-simulator";
import { MenuScanUpload } from "@/components/onboarding/menu-scan-upload";
import { MenuScanPreview } from "@/components/onboarding/menu-scan-preview";
import type { ExtractedMenu } from "@/lib/types";
import { useMenuStore } from "@/stores/menu-store";
import { useLanguage } from "@/i18n/language-context";

type StepKey = "register" | "menu" | "simulate" | "whatsapp";

const STEP_LABEL_KEYS: Record<string, string> = {
  register: "onboarding_wizard.step_register",
  menu: "onboarding_wizard.step_menu",
  simulate: "onboarding_wizard.step_simulate",
  whatsapp: "onboarding_wizard.step_whatsapp",
};

const STEPS = [
  { key: "register" as const, labelKey: STEP_LABEL_KEYS.register, icon: UserCheck },
  { key: "menu" as const, labelKey: STEP_LABEL_KEYS.menu, icon: UtensilsCrossed },
  { key: "simulate" as const, labelKey: STEP_LABEL_KEYS.simulate, icon: Terminal },
  { key: "whatsapp" as const, labelKey: STEP_LABEL_KEYS.whatsapp, icon: Radio },
];

const STORAGE_KEY = "nadil-onboarding-steps";

function getInitialCompleted(): Record<StepKey, boolean> {
  const defaultSteps: Record<StepKey, boolean> = {
    register: true,
    menu: false,
    simulate: false,
    whatsapp: false,
  };

  if (typeof window === "undefined") return defaultSteps;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSteps, ...parsed, register: true };
    }
  } catch {
    // corrupted data, use defaults
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSteps));
  return defaultSteps;
}

function getStepFromParams(
  param: string | null
): StepKey {
  if (param && STEPS.some((s) => s.key === param)) {
    return param as StepKey;
  }
  return "menu";
}

function ensureRegisterInStorage() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data.register = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100/60">
      <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
      <p className="text-sm text-indigo-700">{children}</p>
    </div>
  );
}

function StepContent({
  step,
  onComplete,
  onSkip,
  scanMode,
  setScanMode,
  extractedData,
  setExtractedData,
  onSaveMenu,
  saving,
  saveError,
}: {
  step: StepKey;
  onComplete: (step: StepKey) => void;
  onSkip: (step: StepKey) => void;
  scanMode: "idle" | "upload" | "preview";
  setScanMode: (mode: "idle" | "upload" | "preview") => void;
  extractedData: ExtractedMenu | null;
  setExtractedData: (data: ExtractedMenu | null) => void;
  onSaveMenu: (menu: ExtractedMenu) => void;
  saving: boolean;
  saveError: string | null;
}) {
  const { t } = useLanguage();
  const router = useRouter();

  switch (step) {
    case "register":
      return (
        <div className="text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
              {t("onboarding_wizard.already_registered")}
            </h2>
            <p className="mt-2 text-slate-500">
              {t("onboarding_wizard.account_setup_desc")}
            </p>
          </div>
          <Button
            onClick={() => onSkip("register")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {t("onboarding_wizard.continue_setup")}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      );

    case "menu":
      if (scanMode === "upload") {
        return (
          <MenuScanUpload
            onAnalyzed={(data) => {
              setExtractedData(data);
              setScanMode("preview");
            }}
            onCancel={() => setScanMode("idle")}
          />
        );
      }

      if (scanMode === "preview" && extractedData) {
        return (
          <MenuScanPreview
            data={extractedData}
            onSave={onSaveMenu}
            onCancel={() => setScanMode("idle")}
            onBack={() => setScanMode("upload")}
            saving={saving}
            error={saveError}
          />
        );
      }

      return (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
              <UtensilsCrossed className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
              {t("onboarding_wizard.add_menu_title")}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              {t("onboarding_wizard.add_menu_desc")}
            </p>
          </div>

          <TipBox>
            {t("onboarding_wizard.menu_tip")}
          </TipBox>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => setScanMode("upload")}
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <Camera className="w-4 h-4" />
              {t("onboarding_wizard.scan_photo")}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/menu")}
              className="w-full sm:w-auto"
            >
              {t("onboarding_wizard.go_to_menu")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => onComplete("menu")}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Check className="w-4 h-4" />
              {t("onboarding_wizard.mark_complete")}
            </Button>
            <button
              onClick={() => onSkip("menu")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {t("onboarding_wizard.skip_for_now")}
            </button>
          </div>
        </div>
      );

    case "simulate":
      return (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
              <Terminal className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
              {t("onboarding_wizard.try_ai_waiter")}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              {t("onboarding_wizard.simulator_desc")}
            </p>
          </div>

          <InlineSimulator />

          <TipBox>
            {t("onboarding_wizard.simulator_tip")}
          </TipBox>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => onComplete("simulate")}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Check className="w-4 h-4" />
              {t("onboarding_wizard.mark_complete")}
            </Button>
            <button
              onClick={() => onSkip("simulate")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {t("onboarding_wizard.skip_for_now")}
            </button>
          </div>
        </div>
      );

    case "whatsapp":
      return (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
              <Radio className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
              {t("onboarding_wizard.connect_whatsapp_title")}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              {t("onboarding_wizard.connect_whatsapp_desc")}
            </p>
          </div>

          <TipBox>
            {t("onboarding_wizard.whatsapp_tip")}
          </TipBox>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => router.push("/whatsapp")}
              className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe5b] text-white"
            >
              {t("onboarding_wizard.connect_whatsapp")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => onComplete("whatsapp")}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Check className="w-4 h-4" />
              {t("onboarding_wizard.mark_complete")}
            </Button>
            <button
              onClick={() => onSkip("whatsapp")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {t("onboarding_wizard.skip_for_now")}
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [completedSteps, setCompletedSteps] =
    useState<Record<StepKey, boolean>>(getInitialCompleted);
  const [mounted, setMounted] = useState(false);
  const [scanMode, setScanMode] = useState<"idle" | "upload" | "preview">("idle");
  const [extractedData, setExtractedData] = useState<ExtractedMenu | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    ensureRegisterInStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const stepsWithLabels = useMemo(
    () => STEPS.map((s) => ({ ...s, label: t(s.labelKey) })),
    [t]
  );

  const currentStep = getStepFromParams(
    searchParams.get("step")
  );

  const updateSteps = useCallback(
    (step: StepKey, complete: boolean) => {
      setCompletedSteps((prev) => {
        const next = { ...prev, [step]: complete };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    []
  );

  const advanceStep = useCallback(
    (fromStep: StepKey) => {
      const currentIndex = stepsWithLabels.findIndex((s) => s.key === fromStep);
      const nextStep = stepsWithLabels[currentIndex + 1];

      if (!nextStep) {
        router.push("/dashboard");
        return;
      }

      router.push(`/onboarding?step=${nextStep.key}`);
    },
    [router]
  );

  const handleComplete = useCallback(
    (step: StepKey) => {
      updateSteps(step, true);
      advanceStep(step);
    },
    [updateSteps, advanceStep]
  );

  const handleSkip = useCallback(
    (step: StepKey) => {
      advanceStep(step);
    },
    [advanceStep]
  );

  const handleSaveMenu = useCallback(
    async (menu: ExtractedMenu) => {
      setSaving(true);
      setSaveError(null);
      try {
        await useMenuStore.getState().bulkCreateMenu({
          categories: menu.categories,
        });
        setScanMode("idle");
        setExtractedData(null);
        handleComplete("menu");
      } catch {
        setSaveError(t("onboarding_wizard.failed_save_menu"));
      } finally {
        setSaving(false);
      }
    },
    [handleComplete]
  );

  const handleStepClick = useCallback(
    (step: string) => {
      router.push(`/onboarding?step=${step}`);
    },
    [router]
  );

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Stepper */}
      <OnboardingStepper
        steps={stepsWithLabels}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step content */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/40 shadow-xl shadow-indigo-500/5 p-6 sm:p-8">
        <StepContent
          step={currentStep}
          onComplete={handleComplete}
          onSkip={handleSkip}
          scanMode={scanMode}
          setScanMode={setScanMode}
          extractedData={extractedData}
          setExtractedData={setExtractedData}
          onSaveMenu={handleSaveMenu}
          saving={saving}
          saveError={saveError}
        />
      </div>
    </div>
  );
}
