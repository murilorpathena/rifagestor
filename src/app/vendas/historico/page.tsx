import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Histórico de vendas" };

export default async function HistoricoPage() {
  const supabase = getSupabase();

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

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  const orgId = membership?.organization_id;
  let sales: any[] = [];

  if (orgId) {
    const { data } = await supabase
      .from("sales")
      .select("id, buyer_id, quantity, total_cents, payment_method, payment_status, sold_at")
      .eq("organization_id", orgId)
      .order("sold_at", { ascending: false });
    sales = data ?? [];
  }

  // Fetch buyers for names
  const buyerIds = [...new Set(sales.map((s) => s.buyer_id))];
  let buyers: Record<string, string> = {};
  if (buyerIds.length > 0) {
    const { data: b } = await supabase.from("buyers").select("id, name").in("id", buyerIds);
    buyers = Object.fromEntries((b ?? []).map((x) => [x.id, x.name]));
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
        <h1 className="text-xl font-extrabold tracking-tight">Histórico de vendas</h1>
        {sales.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-xl border border-[var(--line)] bg-white p-3 card-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{buyers[sale.buyer_id] || "Comprador"}</p>
                  <span className={`text-xs font-medium ${sale.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                    {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{sale.quantity} número(s) • {methodLabel(sale.payment_method)}</span>
                  <span>{formatDateTime(sale.sold_at)}</span>
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-sm font-bold text-[var(--brand)]">{formatCurrency(sale.total_cents)}</span>
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
