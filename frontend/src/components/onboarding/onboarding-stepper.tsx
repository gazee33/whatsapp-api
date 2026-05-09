"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface OnboardingStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: Record<string, boolean>;
  onStepClick: (step: string) => void;
}

export function OnboardingStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: OnboardingStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = completedSteps[step.key];
        const isCurrent = step.key === currentStep;
        const isPast = currentIndex > i;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            {/* Connecting line (before) */}
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 min-w-8 sm:min-w-12 flex-1",
                  isCompleted || isPast
                    ? "bg-emerald-400"
                    : "bg-slate-200"
                )}
              />
            )}

            {/* Step circle + label */}
            <button
              onClick={() => onStepClick(step.key)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200",
                  isCompleted &&
                    "bg-emerald-500 text-white",
                  isCurrent &&
                    "bg-indigo-500 text-white ring-4 ring-indigo-100",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block text-center whitespace-nowrap",
                  isCompleted && "text-emerald-600",
                  isCurrent && "text-indigo-600",
                  !isCompleted && !isCurrent && "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connecting line (after, for last step) */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 min-w-8 sm:min-w-12 flex-1",
                  isCompleted
                    ? "bg-emerald-400"
                    : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
