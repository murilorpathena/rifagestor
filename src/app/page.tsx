"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/app/loading-screen";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setChecked(true);
      if (user) router.replace("/painel");
      else router.replace("/entrar");
    }
  }, [loading, router, user]);

  if (!checked) return <LoadingScreen message="Entrando..." />;
  return null;
}
