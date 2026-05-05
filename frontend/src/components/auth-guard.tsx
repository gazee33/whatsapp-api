"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useShallow } from "zustand/react/shallow";
import { PageLoading } from "@/components/shared/loading";

interface AuthGuardProps {
  children: React.ReactNode;
  type: "tenant" | "platform";
}

export function AuthGuard({ children, type }: AuthGuardProps) {
  const router = useRouter();

  const tenantAuth = useAuthStore(
    useShallow((s) => ({
      isAuth: s.isAuthenticated,
      user: s.user,
      token: s.accessToken,
      hydrated: s.hydrated,
    }))
  );

  const platformAuth = useAuthStore(
    useShallow((s) => ({
      isAuth: s.isPlatformAuthenticated,
      user: s.platformUser,
      token: s.platformToken,
      hydrated: s.hydrated,
    }))
  );

  const auth = type === "tenant" ? tenantAuth : platformAuth;

  useEffect(() => {
    if (!auth.hydrated) return;
    if (!auth.isAuth) {
      const loginPath = type === "tenant" ? "/login" : "/platform-login";
      router.replace(loginPath);
    }
  }, [auth.hydrated, auth.isAuth, router, type]);

  if (!auth.hydrated) {
    return <PageLoading message="Restoring session..." />;
  }

  if (!auth.isAuth) {
    return <PageLoading message="Redirecting to login..." />;
  }

  return <>{children}</>;
}
