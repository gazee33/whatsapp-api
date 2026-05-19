"use client";

import { useAuthStore } from "@/stores/auth-store";
import { getInitials } from "@/lib/utils";
import { Moon, Sun, LogOut, Menu, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";

interface PlatformHeaderProps {
  onToggleSidebar: () => void;
}

export function PlatformHeader({ onToggleSidebar }: PlatformHeaderProps) {
  const { platformUser, platformLogout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();

  const handleLogout = async () => {
    await platformLogout();
    router.push("/platform-login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t("sidebar.close_menu")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">
          {t("header.platform_admin")}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="text-muted-foreground hover:text-foreground"
          title={t("header.toggle_language")}
        >
          <Languages className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {getInitials(platformUser?.name || platformUser?.email || "A")}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{platformUser?.name}</p>
                <p className="text-xs text-muted-foreground">{platformUser?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="me-2 h-4 w-4" />
              {t("header.log_out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
