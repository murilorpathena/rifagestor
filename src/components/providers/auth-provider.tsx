"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      // Quando a sessão é removida (signOut), redireciona para o login.
      if (!nextSession) {
        void router.push("/entrar");
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        const sb = getSupabase();
        if (!sb) return;
        try {
          await sb.auth.signOut();
        } catch {
          // ignora erros de rede no signOut; ainda assim limpa o storage local
        }
        // Limpa qualquer resquício de sessão no storage do navegador.
        const keys = Object.keys(localStorage).filter(
          (k) => k.startsWith("sb-") || k.includes("auth"),
        );
        keys.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
        void router.push("/entrar");
      },
    }),
    [loading, session, user, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
