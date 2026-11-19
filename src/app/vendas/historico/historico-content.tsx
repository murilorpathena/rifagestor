"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { MobileHeader } from "@/components/app/mobile-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { SkeletonNumberGrid } from "@/components/app/skeleton-loading";

export default function HistoricoContent() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const { userRole, organization, profile, canManage, loading: wsLoading } = useWorkspace();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    if (!supabase || wsLoading) return;
    setLoading(true);

    let query = supabase
      .from("sales")
      .select("id, buyer_id, quantity, total_cents, payment_method, payment_status, sold_at, seller_id")
      .order("sold_at", { ascending: false });

    if (userRole === "vendedor" && profile?.id) {
      query = query.eq("seller_id", profile.id);
    } else if (organization?.id) {
      query = query.eq("organization_id", organization.id);
    }

    const { data, error } = await query;
    if (error) showToast(error.message, "error");
    const rows = data ?? [];

    const buyerIds = [...new Set(rows.map((s: any) => s.buyer_id))];
    let buyers: Record<string, string> = {};
    if (buyerIds.length > 0) {
      const { data: b } = await supabase.from("buyers").select("id, name").in("id", buyerIds);
      buyers = Object.fromEntries((b ?? []).map((x: any) => [x.id, x.name]));
    }

    let sellers: Record<string, string> = {};
    if (canManage && userRole !== "vendedor") {
      const sellerIds = [...new Set(rows.map((s: any) => s.seller_id))];
      if (sellerIds.length > 0) {
        const { data: p } = await supabase.from("profiles").select("id, name").in("id", sellerIds);
        sellers = Object.fromEntries((p ?? []).map((x: any) => [x.id, x.name]));
      }
    }

    setSales(
      rows.map((sale: any) => ({
        ...sale,
        buyer_name: buyers[sale.buyer_id] || "Comprador",
        seller_name: sellers[sale.seller_id] || null,
      })),
    );
    setLoading(false);
  }, [supabase, wsLoading, userRole, organization?.id, profile?.id, canManage, showToast]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  async function updateStatus(saleId: string, status: "paid" | "cancelled") {
    if (!supabase) return;
    setBusyId(saleId);
    const { error } = await supabase.rpc("set_sale_status", {
      p_sale_id: saleId,
      p_status: status,
    });
    if (error) showToast(error.message, "error");
    else {
      showToast(status === "paid" ? "Venda marcada como paga." : "Venda cancelada.", "success");
      await loadSales();
    }
    setBusyId(null);
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
      <MobileHeader title="Vendas" userMenu />
      <div className="px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            {userRole === "vendedor" ? "Minhas Vendas" : "Histórico de vendas"}
          </h1>
          <p className="text-sm text-[var(--muted)]">{sales.length} venda(s) registrada(s)</p>
        </div>

        {loading ? (
          <SkeletonNumberGrid />
        ) : sales.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-xl border border-[var(--line)] bg-white p-3 card-shadow">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{sale.buyer_name}</p>
                  <span className={`shrink-0 text-xs font-medium ${sale.payment_status === "paid" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                    {sale.payment_status === "paid" ? "Pago" : sale.payment_status === "cancelled" ? "Cancelado" : "Pendente"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{sale.quantity} número(s) • {methodLabel(sale.payment_method)}</span>
                  <span>{formatDateTime(sale.sold_at)}</span>
                </div>
                {sale.seller_name ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">Vendedor: {sale.seller_name}</p>
                ) : null}
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-sm font-bold">{formatCurrency(sale.total_cents)}</span>
                  {canManage && sale.payment_status !== "paid" && sale.payment_status !== "cancelled" ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busyId === sale.id}
                        onClick={() => void updateStatus(sale.id, "paid")}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-[11px] font-medium hover:bg-[#f7f7f7]"
                      >
                        <CheckCircle2 className="size-3.5" /> Pago
                      </button>
                      <button
                        type="button"
                        disabled={busyId === sale.id}
                        onClick={() => void updateStatus(sale.id, "cancelled")}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-[11px] font-medium text-[var(--danger)] hover:bg-red-50"
                      >
                        <XCircle className="size-3.5" /> Cancelar
                      </button>
                    </div>
                  ) : null}
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
