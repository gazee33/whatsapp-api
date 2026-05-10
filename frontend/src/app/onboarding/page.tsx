"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCheck,
  UtensilsCrossed,
  Terminal,
  Radio,
  Check,
  Info,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { InlineSimulator } from "@/components/onboarding/inline-simulator";

type StepKey = "register" | "menu" | "simulate" | "whatsapp";

const STEPS = [
  { key: "register" as const, label: "Register", icon: UserCheck },
  { key: "menu" as const, label: "Menu", icon: UtensilsCrossed },
  { key: "simulate" as const, label: "Simulate", icon: Terminal },
  { key: "whatsapp" as const, label: "WhatsApp", icon: Radio },
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
}: {
  step: StepKey;
  onComplete: (step: StepKey) => void;
  onSkip: (step: StepKey) => void;
}) {
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
              You&apos;ve already registered!
            </h2>
            <p className="mt-2 text-slate-500">
              Your account is set up. Let&apos;s move on to setting up your
              restaurant.
            </p>
          </div>
          <Button
            onClick={() => onSkip("register")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Continue Setup
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      );

    case "menu":
      return (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
              <UtensilsCrossed className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
              Add Your Menu Items
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Upload your menu so your AI agent can help customers order. This
              only takes a few minutes.
            </p>
          </div>

          <TipBox>
            Tip: You can add categories like Appetizers, Main Courses, and
            Drinks to keep your menu organized.
          </TipBox>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => router.push("/menu")}
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              Go to Menu
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
              Mark as Complete
            </Button>
            <button
              onClick={() => onSkip("menu")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Skip for now
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
              Try Your AI Waiter
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Send a test message and see how Nadil AI responds to customer
              orders in natural conversation.
            </p>
          </div>

          <InlineSimulator />

          <TipBox>
            Try asking about the menu, placing an order, or inquiring about
            prices — just like your customers would.
          </TipBox>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => onComplete("simulate")}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Check className="w-4 h-4" />
              Mark as Complete
            </Button>
            <button
              onClick={() => onSkip("simulate")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Skip for now
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
              Connect Your WhatsApp
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Link your WhatsApp Business number to start receiving real
              customer orders via WhatsApp.
            </p>
          </div>

          <TipBox>
            Make sure you have a WhatsApp Business account ready before
            connecting.
          </TipBox>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => router.push("/whatsapp")}
              className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe5b] text-white"
            >
              Connect WhatsApp
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
              Mark as Complete
            </Button>
            <button
              onClick={() => onSkip("whatsapp")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Skip for now
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
  const [completedSteps, setCompletedSteps] =
    useState<Record<StepKey, boolean>>(getInitialCompleted);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ensureRegisterInStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
      const currentIndex = STEPS.findIndex((s) => s.key === fromStep);
      const nextStep = STEPS[currentIndex + 1];

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
        steps={STEPS}
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
        />
      </div>
    </div>
  );
}
