import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { User, ShieldCheck, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Equipe" userMenu />
        <div className="rounded-2xl border border-[var(--line)] bg-amber-50 p-6 card-shadow">
          <h1 className="text-xl font-bold mb-3">Supabase não configurado</h1>
          <p className="text-sm text-amber-700">
            Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.
          </p>
        </div>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  const orgId = membership?.organization_id;
  const isOwner = membership?.role === "owner";
  let members: any[] = [];

  if (orgId) {
    const { data } = await supabase
      .from("organization_members")
      .select("id, role, created_at, user_id, profiles(name, email)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    members = data ?? [];
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Equipe" userMenu />
      <div className="px-4 py-6 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Equipe de vendas</h1>
          {isOwner && (
            <Link href="/convites" className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-dark)]">
              <Plus className="size-3.5" /> Convidar
            </Link>
          )}
        </div>

        <p className="text-sm text-[var(--muted)]">
          Todos os membros da organização têm acesso à gestão completa da rifa.
        </p>

        {members.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhum membro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const profile = member.profiles?.[0] || member.profiles;
              return (
                <div key={member.id} className="rounded-xl border border-[var(--line)] bg-white p-3 card-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] font-bold text-xs">
                        {profile?.name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile?.name || "Usuário"}</p>
                        <p className="text-xs text-[var(--muted)]">{profile?.email || "—"}</p>
                      </div>
                    </div>
                    <Badge role={member.role} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] mt-2">
                    <span>{member.role === "owner" ? "Proprietário" : "Vendedor"}</span>
                    <span>Desde {new Date(member.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function Badge({ role }: { role: string }) {
  const color = role === "owner" ? "bg-[#f7f7f7] text-[var(--ink)] border border-[var(--line)]" : "bg-[#f7f7f7] text-[var(--ink)] border border-[var(--line)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase ${color}`}>
      {role === "owner" ? "Dono" : "Vendedor"}
    </span>
  );
}
