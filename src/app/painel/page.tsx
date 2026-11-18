import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { StatCard } from "@/components/app/stat-card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { BarChart2, Ticket, ShoppingCart, Clock, AlertCircle, ChevronRight, Check } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Painel" };

interface SaleRow {
  id: string;
  buyer_name: string;
  quantity: number;
  total_cents: number;
  payment_status: string;
  created_at: string;
}

export default async function PainelPage() {
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <main className="min-h-screen pb-24 px-4 py-6">
        <MobileHeader title="Painel" userMenu />
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
  let numbers: any[] = [];
  let sales: SaleRow[] = [];
  let buyersCount = 0;

  if (orgId) {
    const { data: r } = await supabase
      .from("raffles")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    raffle = r;

    const [n, s, b, buyers] = await Promise.all([
      supabase
        .from("raffle_numbers")
        .select("id, number, status")
        .eq("raffle_id", r?.id ?? "")
        .order("number", { ascending: true }),
      supabase
        .from("sales")
        .select("id, buyer_id, quantity, total_cents, payment_status, created_at")
        .eq("organization_id", orgId)
        .order("sold_at", { ascending: false })
        .limit(20),
      supabase.from("buyers").select("id", { count: "exact" }).eq("organization_id", orgId),
      supabase.from("buyers").select("id, name").eq("organization_id", orgId),
    ]);
    numbers = n.data ?? [];
    const buyersMap = Object.fromEntries((buyers.data ?? []).map((b: any) => [b.id, b.name]));
    sales = (s.data ?? []).map((sale: any) => ({
      ...sale,
      buyer_name: buyersMap[sale.buyer_id] || "Comprador",
    }));
    buyersCount = b.count ?? 0;
  }

  const available = numbers.filter((n) => n.status === "available").length;
  const sold = numbers.filter((n) => n.status === "sold").length;
  const reserved = numbers.filter((n) => n.status === "reserved").length;
  const totalRevenue = sales.reduce((acc, sale) => acc + (sale.payment_status === "paid" ? sale.total_cents : 0), 0);

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Painel" userMenu />
      <div className="px-4 py-6 space-y-5 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Painel</h1>
            <p className="text-sm text-[var(--muted)]">Resumo da sua rifa</p>
          </div>
          <Link
            href="/vendas"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
          >
            Nova venda <ShoppingCart className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Números livres" value={available} sub={`de ${numbers.length}`} icon={Ticket} variant="default" />
          <StatCard label="Vendidos" value={sold} sub={available === 0 ? "Rifa esgotada" : undefined} icon={Check} variant="success" />
          <StatCard label="Reservados" value={reserved} sub="Pendentes de pagamento" icon={Clock} variant="warning" />
          <StatCard label="Receita" value={formatCurrency(totalRevenue)} sub="Vendas pagas" icon={ShoppingCart} variant="default" />
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Últimas vendas</h2>
            <Link href="/vendas/historico" className="text-xs font-semibold text-[var(--brand)] hover:underline">Ver tudo</Link>
          </div>
          {sales.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#fcfdfc]">
                  <div>
                    <p className="text-sm font-medium">{sale.buyer_name}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDateTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(sale.total_cents)}</p>
                    <span className={`text-xs font-medium ${sale.payment_status === "paid" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                      {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
          <h2 className="text-base font-bold mb-3">Progresso dos números</h2>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(Math.ceil(Math.sqrt(numbers.length)))].map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {[...Array(Math.ceil(Math.sqrt(numbers.length)))].map((_, colIndex) => {
                  const num = rowIndex * Math.ceil(Math.sqrt(numbers.length)) + colIndex + 1;
                  const n = numbers.find((x) => x.number === num);
                  if (!n) return null;
                  const color = n.status === "sold" ? "bg-[var(--ink)]" : n.status === "reserved" ? "bg-[#999999]" : "bg-[#e5e5e5]";
                  return <div key={num} className="h-2 w-2 rounded-full {color}" />;
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Disponíveis</span>
            <span>{available}</span>
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
