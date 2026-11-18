import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { Settings, Ticket, Calendar, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Configurações" userMenu />
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
  let raffle: any = null;

  if (orgId) {
    const { data } = await supabase.from("raffles").select("*").eq("organization_id", orgId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    raffle = data;
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Configurações" userMenu />
      <div className="px-4 py-6 space-y-5 pb-6">
        <h1 className="text-xl font-extrabold tracking-tight">Configurações da rifa</h1>

        {raffle ? (
          <>
            <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                  <div className="flex items-center gap-3">
                    <Ticket className="size-4 text-[var(--brand)]" />
                    <div>
                      <p className="text-sm font-medium">{raffle.title}</p>
                      <p className="text-xs text-[var(--muted)]">Título da rifa</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--muted)] uppercase">R$ { (raffle.ticket_price_cents / 100).toFixed(2) }</span>
                </div>
                {raffle.description && (
                  <div className="px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                    <p className="text-sm text-[var(--muted)]">{raffle.description}</p>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-[var(--brand)]" />
                    <div>
                      <p className="text-sm font-medium">{raffle.draw_date ? new Date(raffle.draw_date).toLocaleDateString("pt-BR") : "Não definida"}</p>
                      <p className="text-xs text-[var(--muted)]">Data do sorteio</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--muted)] uppercase">{raffle.status}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="size-4 text-[var(--brand)]" />
                    <div>
                      <p className="text-sm font-medium">{raffle.total_numbers} números</p>
                      <p className="text-xs text-[var(--muted)]">Total de números</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--muted)] uppercase">{raffle.default_numbers_per_sale} por venda</span>
                </div>
              </div>
            </section>

            {!isOwner && (
              <div className="rounded-xl border border-[var(--line)] bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Apenas o proprietário pode alterar estas configurações.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhuma rifa configurada.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
