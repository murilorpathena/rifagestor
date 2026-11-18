"use client";

import { useEffect, useState } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { User, Mail, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PerfilContent() {
  const supabase = useClientSupabase();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("name, email, created_at").eq("id", u.id).single();
        setProfile(p);
        const { data: m } = await supabase.from("organization_members").select("role, organizations(name)").eq("user_id", u.id).single();
        setMembership(m);
      }
      setLoading(false);
    })();
  }, [supabase]);

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Meu perfil" userMenu />
        <div className="rounded-2xl border border-[var(--line)] bg-amber-50 p-6 card-shadow">
          <h1 className="text-xl font-bold mb-3">Supabase não configurado</h1>
          <p className="text-sm text-amber-700">
            Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Meu perfil" userMenu />
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
          <p className="text-sm text-[var(--muted)]">Carregando perfil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Meu perfil" userMenu />
      <div className="px-4 py-6 space-y-5 pb-6">
        <h1 className="text-xl font-extrabold tracking-tight">Perfil</h1>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-[#f7f7f7] text-[var(--ink)] font-extrabold text-lg">
              {profile?.name?.[0] || "U"}
            </div>
            <div>
              <p className="font-bold">{profile?.name || "Usuário"}</p>
              <p className="text-xs text-[var(--muted)]">{profile?.email || user?.email || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
              <p className="text-xs text-[var(--muted)]">Organização</p>
              <p className="text-sm font-medium">{String(membership?.organizations?.[0]?.name ?? "—")}</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
              <p className="text-xs text-[var(--muted)]">Função</p>
              <p className="text-sm font-bold">
                {membership?.role === "owner" ? "Proprietário" : "Vendedor"}
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-[var(--line)] bg-white p-4 card-shadow">
          <button
            type="button"
            className="focus-ring w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-semibold text-[var(--danger)] hover:bg-red-100 transition"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="mr-2 size-4" /> Sair da conta
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
