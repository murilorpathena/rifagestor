"use client";

import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useEffect, useState } from "react";
import { SkeletonNumberGrid } from "@/components/app/skeleton-loading";

export default function HistoricoContent() {
  const supabase = getSupabase();
  const { userRole, organization, profile, loading: wsLoading } = useWorkspace();

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Histórico" />
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
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wsLoading) return;
    loadSales();
  }, [wsLoading, userRole, organization, profile, sb]);

  async function loadSales() {
    setLoading(true);

    let query = sb
      .from("sales")
      .select("id, buyer_id, quantity, total_cents, payment_method, payment_status, sold_at, seller_id")
      .order("sold_at", { ascending: false });

    if (userRole === 'vendedor' && profile?.id) {
      query = query.eq("seller_id", profile.id);
    } else if (userRole === 'gestor' && organization?.id) {
      query = query.eq("organization_id", organization.id);
    }
    // Admin não filtra

    const { data } = await query;
    setSales(data ?? []);

    // Buscar compradores
    const buyerIds = [...new Set((data ?? []).map((s: any) => s.buyer_id))];
    let buyers: Record<string, string> = {};
    if (buyerIds.length > 0) {
      const { data: b } = await sb.from("buyers").select("id, name").in("id", buyerIds);
      buyers = Object.fromEntries((b ?? []).map((x: any) => [x.id, x.name]));
    }

    setSales((data ?? []).map((sale: any) => ({
      ...sale,
      buyer_name: buyers[sale.buyer_id] || "Comprador",
    })));

    setLoading(false);
  }

  const methodLabel = (m: string) => {
    switch (m) {
      case "pix": return "PIX";
      case "cash": return "Dinheiro";
      case "card": return "Cartão";
      default: return "Outro";
    }
  };

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Histórico" />
      <div className="px-4 py-6 space-y-4 pb-6">
        <h1 className="text-xl font-extrabold tracking-tight">
          {userRole === 'vendedor' ? "Minhas Vendas" : "Histórico de vendas"}
        </h1>
        {loading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
              <SkeletonNumberGrid />
            </div>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-xl border border-[var(--line)] bg-white p-3 card-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{sale.buyer_name}</p>
                  <span className={`text-xs font-medium ${sale.payment_status === "paid" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                    {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{sale.quantity} número(s) • {methodLabel(sale.payment_method)}</span>
                  <span>{formatDateTime(sale.sold_at)}</span>
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-sm font-bold text-[var(--ink)]">{formatCurrency(sale.total_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
