"use client";

import { LogOut, Mail, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  vendedor: "Vendedor",
  owner: "Gestor",
  member: "Vendedor",
};

export default function PerfilContent() {
  const { signOut } = useAuth();
  const { profile, organization, userRole, loading } = useWorkspace();

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Meu perfil" userMenu />
      <div className="px-4 py-6 space-y-5">
        <h1 className="text-xl font-extrabold tracking-tight">Perfil</h1>

        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">Carregando perfil...</p>
        ) : (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
            <div className="mb-4 flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-[#f7f7f7] text-lg font-extrabold">
                {profile?.name?.[0] ?? "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{profile?.name ?? "Usuário"}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
                  <Mail className="size-3.5" /> {profile?.email ?? "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
                <p className="text-xs text-[var(--muted)]">Organização</p>
                <p className="text-sm font-medium">{organization?.name ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
                <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <ShieldCheck className="size-3.5" /> Função
                </p>
                <p className="text-sm font-bold">{roleLabels[userRole ?? ""] ?? "—"}</p>
              </div>
            </div>
          </section>
        )}

        <div className="rounded-xl border border-[var(--line)] bg-white p-4 card-shadow">
          <button
            type="button"
            className="focus-ring w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-semibold text-[var(--danger)] transition hover:bg-red-100"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 size-4" /> Sair da conta
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
