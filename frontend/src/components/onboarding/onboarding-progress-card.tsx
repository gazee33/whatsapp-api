"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  UserCheck,
  UtensilsCrossed,
  Terminal,
  Radio,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  getOnboardingProgress,
  isOnboardingDismissed,
  dismissOnboarding,
  type OnboardingProgress,
} from "@/config/navigation";
import { useLanguage } from "@/i18n/language-context";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserCheck,
  UtensilsCrossed,
  Terminal,
  Radio,
};

function readProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return { register: false, menu: false, simulate: false, whatsapp: false };
  }
  return getOnboardingProgress();
}

export function OnboardingProgressCard() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && isOnboardingDismissed()
  );
  const [completed, setCompleted] = useState<OnboardingProgress>(readProgress);

  useEffect(() => {
    const refresh = () => setCompleted(readProgress());

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "nadil-onboarding-steps") refresh();
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const completedCount = ONBOARDING_STEPS.filter(
    (s) => completed[s.key as keyof OnboardingProgress]
  ).length;
  const totalCount = ONBOARDING_STEPS.length;
  const allComplete = completedCount === totalCount;

  const dismiss = () => {
    dismissOnboarding();
    setDismissed(true);
  };

  if (allComplete && dismissed) {
    return null;
  }

  if (dismissed && !allComplete) {
    const nextIncomplete = ONBOARDING_STEPS.find(
      (s) => !completed[s.key as keyof OnboardingProgress]
    );
    return (
      <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
            <UserCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {t("onboarding_wizard.complete_setup")} ({completedCount}/{totalCount})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
        >
          <Link
            href={
              nextIncomplete
                ? `/onboarding?step=${nextIncomplete.key}`
                : "/dashboard"
            }
          >
            {t("common.continue")}
          </Link>
        </Button>
      </div>
    );
  }

  const nextIncomplete = ONBOARDING_STEPS.find(
    (s) => !completed[s.key as keyof OnboardingProgress]
  );

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("onboarding_wizard.setup_progress")}</CardTitle>
        <button
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex items-center justify-between gap-3">
          {ONBOARDING_STEPS.map((step, idx) => {
            const stepKey = step.key as keyof OnboardingProgress;
            const isComplete = completed[stepKey];
            const isCurrent =
              !isComplete && nextIncomplete?.key === step.key;
            const isPending = !isComplete && !isCurrent;
            const Icon = ICON_MAP[step.iconName] ?? UserCheck;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all",
                      isComplete &&
                        "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                      isCurrent &&
                        "border-indigo-500 bg-indigo-50 text-indigo-600 animate-pulse dark:border-indigo-400 dark:bg-indigo-950/30 dark:text-indigo-400",
                      isPending &&
                        "border-muted-foreground/30 bg-muted/30 text-muted-foreground dark:border-muted-foreground/20 dark:bg-muted/10"
                    )}
                  >
                    {isComplete ? (
                      <>
                        <Icon className="h-5 w-5" />
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      </>
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isComplete &&
                        "text-emerald-600 line-through dark:text-emerald-400",
                      isCurrent &&
                        "text-indigo-600 font-semibold dark:text-indigo-400",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                </div>
                {idx < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-full flex-1",
                      completed[stepKey] &&
                        completed[
                          ONBOARDING_STEPS[idx + 1]
                            .key as keyof OnboardingProgress
                        ]
                        ? "bg-emerald-300 dark:bg-emerald-700"
                        : completed[stepKey]
                          ? "bg-indigo-300 dark:bg-indigo-700"
                          : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            asChild
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Link
              href={
                nextIncomplete
                  ? `/onboarding?step=${nextIncomplete.key}`
                  : "/dashboard"
              }
            >
              {t("onboarding_wizard.complete_setup")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
