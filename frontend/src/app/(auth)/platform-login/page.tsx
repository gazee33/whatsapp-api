"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useLanguage } from "@/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Shield, Eye, EyeOff, LogIn } from "lucide-react";

export default function PlatformLoginPage() {
  const router = useRouter();
  const { platformLogin, isLoading } = useAuthStore();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await platformLogin(email, password);
      router.push("/platform");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("platform_login.invalid")
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <Shield className="h-5 w-5 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          {t("platform_login.title")}
        </h2>
        <p className="text-sm text-slate-500">
          {t("platform_login.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t("login.email_label")}</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@platform.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("login.password_label")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("login.password_placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
        loading={isLoading}
      >
        <LogIn className="h-4 w-4" />
        {t("platform_login.sign_in")}
      </Button>

      <p className="text-center text-sm text-slate-500">
        <Link
          href="/login"
          className="font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          {t("platform_login.back_restaurant")}
        </Link>
      </p>
    </form>
  );
}
