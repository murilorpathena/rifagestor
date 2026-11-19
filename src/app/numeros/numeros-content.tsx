"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleDot } from "lucide-react";
import { MobileHeader } from "@/components/app/mobile-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { NumberGrid } from "@/components/app/number-grid";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { SkeletonNumberGrid } from "@/components/app/skeleton-loading";
import type { RaffleNumber } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NumerosContent() {
  const supabase = useClientSupabase();
  const router = useRouter();
  const { showToast } = useToast();
  const { raffle, canManage, loading: wsLoading } = useWorkspace();

  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !raffle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("raffle_numbers")
      .select("id, raffle_id, number, status, sale_id, buyer_id, created_at, updated_at")
      .eq("raffle_id", raffle.id)
      .order("number", { ascending: true });
    if (error) showToast(error.message, "error");
    else setNumbers((data ?? []) as RaffleNumber[]);
    setLoading(false);
  }, [supabase, raffle, showToast]);

  useEffect(() => {
    if (wsLoading) return;
    void load();
  }, [wsLoading, load]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleManage(number: RaffleNumber) {
    if (!supabase || busy) return;
    const nextStatus = number.status === "reserved" ? "available" : "reserved";
    setBusy(true);
    const { error } = await supabase.rpc("set_number_status", {
      p_number_id: number.id,
      p_status: nextStatus,
    });
    if (error) showToast(error.message, "error");
    else await load();
    setBusy(false);
  }

  function sellSelected(items: RaffleNumber[]) {
    if (items.length === 0) return;
    sessionStorage.setItem("rifa:selected-numbers", JSON.stringify(items.map((n) => n.id)));
    router.push("/vendas");
  }

  const total = numbers.length;
  const available = numbers.filter((n) => n.status === "available").length;
  const reserved = numbers.filter((n) => n.status === "reserved").length;
  const sold = numbers.filter((n) => n.status === "sold").length;

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Números" userMenu />
      <div className="px-4 pt-12 pb-6 space-y-5">
        {wsLoading ? (
          <SkeletonNumberGrid />
        ) : !raffle ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">Nenhuma rifa configurada.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">{raffle.title}</h1>
                <p className="text-sm text-[var(--muted)]">
                  {formatCurrency(raffle.ticket_price_cents)} por número
                </p>
              </div>
              {canManage ? (
                <Link
                  href="/configuracoes"
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium hover:bg-[#f7f7f7]"
                >
                  Alterar total de números <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>

            {/* KPIs - 4 cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-[var(--ink)]">{available}</p>
                      <p className="text-[10px] uppercase text-[var(--muted)]">Livres</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl border border-[var(--line)] bg-white flex items-center justify-center text-[10px]">
                      L
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-[var(--ink)]">{reserved}</p>
                      <p className="text-[10px] uppercase text-[var(--muted)]">Reservados</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl border border-[var(--line)] bg-[#f7f7f7] flex items-center justify-center text-[10px] text-[var(--muted)]">
                      R
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-[var(--ink)]">{sold}</p>
                      <p className="text-[10px] uppercase text-[var(--muted)]">Vendidos</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-[var(--ink)] flex items-center justify-center text-white text-[10px]">
                      V
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-[var(--ink)]">{total}</p>
                      <p className="text-[10px] uppercase text-[var(--muted)]">Total</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl border border-[var(--line)] bg-[#f7f7f7] flex items-center justify-center text-[10px] text-[var(--muted)]">
                      T
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded border border-[var(--line)] bg-white" /> Livre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded border border-[var(--line)] bg-[#f7f7f7]" /> Reservado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded bg-[var(--ink)]" /> Vendido
              </span>
            </div>

            {loading ? (
              <SkeletonNumberGrid />
            ) : numbers.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-[var(--muted)]">Nenhum número gerado.</p>
                </CardContent>
              </Card>
            ) : (
              <NumberGrid
                raffle={raffle}
                numbers={numbers}
                selectedNumbers={selected}
                onToggle={toggle}
                onSellSelected={sellSelected}
                onManage={canManage ? handleManage : undefined}
              />
            )}

            {!canManage && selected.size > 0 ? (
              <Button size="lg" className="w-full" onClick={() => sellSelected(numbers.filter((n) => selected.has(n.id)))}>
                Vender {selected.size} número(s) <ArrowRight className="ml-2 size-4" />
              </Button>
            ) : null}

            {!canManage ? (
              <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <CircleDot className="size-3.5" /> Selecione números livres para registrar uma venda.
              </p>
            ) : null}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
