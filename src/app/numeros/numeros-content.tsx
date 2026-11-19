"use client";

import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { NumberGrid } from "@/components/app/number-grid";
import { formatCurrency } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useEffect, useState } from "react";
import { SkeletonNumberGrid } from "@/components/app/skeleton-loading";

export default function NumerosContent() {
  const supabase = getSupabase();
  const { userRole, organization, profile, loading: wsLoading } = useWorkspace();

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

  const sb = supabase;
  const [raffle, setRaffle] = useState<any>(null);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wsLoading) return;
    loadNumbers();
  }, [wsLoading, userRole, organization, profile, sb]);

  async function loadNumbers() {
    setLoading(true);

    if (userRole === 'admin') {
      const { data: orgs } = await sb.from("organizations").select("id").limit(1);
      if (orgs?.[0]) {
        const { data: r } = await sb
          .from("raffles")
          .select("*")
          .eq("organization_id", orgs[0].id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        setRaffle(r);
        if (r) {
          const { data: n } = await sb
            .from("raffle_numbers")
            .select("id, number, status, sale_id, buyer_id")
            .eq("raffle_id", r.id)
            .order("number", { ascending: true });
          setNumbers(n ?? []);
        }
      }
    } else if (organization?.id) {
      const { data: r } = await sb
        .from("raffles")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setRaffle(r);
      if (r) {
        const { data: n } = await sb
          .from("raffle_numbers")
          .select("id, number, status, sale_id, buyer_id")
          .eq("raffle_id", r.id)
          .order("number", { ascending: true });
        setNumbers(n ?? []);
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Números" />
      <div className="px-4 py-6 space-y-5 pb-6">
        {loading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
              <SkeletonNumberGrid />
            </div>
          </div>
        ) : raffle ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="text-xs text-[var(--muted)]">Total</p>
                <p className="text-lg font-bold">{raffle.total_numbers}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="text-xs text-[var(--muted)]">Valor por número</p>
                <p className="text-lg font-bold text-[var(--ink)]">{formatCurrency(raffle.ticket_price_cents)}</p>
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
