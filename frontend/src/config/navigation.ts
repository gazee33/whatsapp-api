// Onboarding step definitions — shared between onboarding wizard and dashboard tracker
export interface OnboardingStepDef {
  key: string;
  label: {
    en: string;
    ar: string;
  };
  iconName: string; // lucide-react icon name as string
  href: string;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    key: "register",
    label: { en: "Sign Up", ar: "إنشاء حساب" },
    iconName: "UserCheck",
    href: "/register",
  },
  {
    key: "menu",
    label: { en: "Fill Menu", ar: "أضف قائمتك" },
    iconName: "UtensilsCrossed",
    href: "/menu",
  },
  {
    key: "simulate",
    label: { en: "Test AI", ar: "جرب المحادثة" },
    iconName: "Terminal",
    href: "/simulator",
  },
  {
    key: "whatsapp",
    label: { en: "Connect WhatsApp", ar: "اربط واتساب" },
    iconName: "Radio",
    href: "/whatsapp",
  },
];

export type OnboardingStepKey = "register" | "menu" | "simulate" | "whatsapp";

export interface OnboardingProgress {
  register: boolean;
  menu: boolean;
  simulate: boolean;
  whatsapp: boolean;
}

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  register: false,
  menu: false,
  simulate: false,
  whatsapp: false,
};

// Read onboarding progress from localStorage
export function getOnboardingProgress(): OnboardingProgress {
  if (typeof window === "undefined") return { ...DEFAULT_ONBOARDING_PROGRESS };
  try {
    const stored = localStorage.getItem("nadil-onboarding-steps");
    if (stored) {
      return { ...DEFAULT_ONBOARDING_PROGRESS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_ONBOARDING_PROGRESS };
}

// Save a specific step as completed
export function completeOnboardingStep(step: OnboardingStepKey): void {
  if (typeof window === "undefined") return;
  const progress = getOnboardingProgress();
  progress[step] = true;
  localStorage.setItem("nadil-onboarding-steps", JSON.stringify(progress));
}

// Save full progress
export function saveOnboardingProgress(progress: OnboardingProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("nadil-onboarding-steps", JSON.stringify(progress));
}

// Check if all steps are complete
export function isOnboardingComplete(): boolean {
  const progress = getOnboardingProgress();
  return progress.register && progress.menu && progress.simulate && progress.whatsapp;
}

// Check if onboarding was dismissed by user
export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("nadil-onboarding-dismissed") === "true";
}

// Mark onboarding as dismissed
export function dismissOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("nadil-onboarding-dismissed", "true");
}

// Count completed steps
export function getCompletedStepCount(): number {
  const progress = getOnboardingProgress();
  return Object.values(progress).filter(Boolean).length;
}
