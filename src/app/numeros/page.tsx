import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { NumberGrid } from "@/components/app/number-grid";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Números" };

export default async function NumerosPage() {
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Números" />
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
    .select("organization_id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  const orgId = membership?.organization_id;
  let raffle: any = null;
  let numbers: any[] = [];

  if (orgId) {
    const { data: r } = await supabase
      .from("raffles")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    raffle = r;

    const { data: n } = await supabase
      .from("raffle_numbers")
      .select("id, number, status, sale_id, buyer_id")
      .eq("raffle_id", r?.id ?? "")
      .order("number", { ascending: true });
    numbers = (n ?? []) as any[];
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Números" />
      <div className="px-4 py-6 space-y-5 pb-6">
        {raffle ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="text-xs text-[var(--muted)]">Total</p>
                <p className="text-lg font-bold">{raffle.total_numbers}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="text-xs text-[var(--muted)]">Valor por número</p>
                <p className="text-lg font-bold text-[var(--brand)]">{formatCurrency(raffle.ticket_price_cents)}</p>
              </div>
            </div>
            <NumberGrid
              raffle={raffle}
              numbers={numbers}
              selectedNumbers={new Set()}
              onToggle={() => {}}
              onSellSelected={() => {}}
            />
          </>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhuma rifa encontrada.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
