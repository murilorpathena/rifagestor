"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "./loading-screen";

export function AuthRequired({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/entrar");
  }, [loading, router, user]);

  if (loading || !user) return <LoadingScreen message="Verificando sua sessão..." />;
  return children;
}
