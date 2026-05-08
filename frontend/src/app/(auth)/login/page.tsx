"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useLanguage } from "@/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { apiKey, setApiKey, login, isLoading } = useAuthStore();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey) {
      setError(t("login.api_key_required"));
      return;
    }

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.invalid_credentials"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">{t("login.welcome_back")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("login.sign_in_subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("login.api_key_label")}</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder={t("login.api_key_placeholder")}
          value={apiKey ?? ""}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("login.email_label")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("login.email_placeholder")}
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

      <Button type="submit" className="w-full" loading={isLoading}>
        <LogIn className="h-4 w-4" />
        {t("login.sign_in")}
      </Button>

      <div className="space-y-2 text-center text-sm">
        <p className="text-muted-foreground">
          {t("login.no_account")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/90 transition-colors"
          >
            {t("login.create_account")}
          </Link>
        </p>
        <p className="text-muted-foreground">
          <Link
            href="/platform-login"
            className="font-medium text-primary/70 hover:text-primary transition-colors"
          >
            {t("login.platform_login")}
          </Link>
        </p>
      </div>
    </form>
  );
}
