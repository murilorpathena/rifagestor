"use client";

import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { StatCard } from "@/components/app/stat-card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { BarChart2, Ticket, ShoppingCart, Clock, Check } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useEffect, useState } from "react";
import { SkeletonStat, SkeletonNumberGrid } from "@/components/app/skeleton-loading";

interface SaleRow {
  id: string;
  buyer_name: string;
  quantity: number;
  total_cents: number;
  payment_status: string;
  created_at: string;
}

export default function PainelContent() {
  const supabase = getSupabase();
  const sb = supabase;
  const { userRole, organization, profile, loading: wsLoading } = useWorkspace();

  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sb || wsLoading || !profile) return;
    void loadStats();
  }, [wsLoading, profile, userRole, organization, sb]);

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

  async function loadStats() {
    if (!sb) return;
    setLoading(true);

    if (userRole === 'admin') {
      const [orgs, nums, sales, buyers] = await Promise.all([
        sb.from("organizations").select("id", { count: "exact" }),
        sb.from("raffle_numbers").select("id, status"),
        sb.from("sales").select("id, total_cents, payment_status, created_at, seller_id"),
        sb.from("buyers").select("id", { count: "exact" }),
      ]);

      const available = (nums.data ?? []).filter((n: any) => n.status === 'available').length;
      const sold = (nums.data ?? []).filter((n: any) => n.status === 'sold').length;
      const reserved = (nums.data ?? []).filter((n: any) => n.status === 'reserved').length;
      const totalRevenue = (sales.data ?? []).reduce((acc: number, s: any) =>
        s.payment_status === 'paid' ? acc + s.total_cents : acc, 0);

      setStats({
        totalOrgs: orgs.count ?? 0,
        totalBuyers: buyers.count ?? 0,
        available,
        sold,
        reserved,
        totalRevenue,
      });

      const { data: recent } = await sb
        .from("sales")
        .select("id, buyer_id, quantity, total_cents, payment_status, created_at, seller_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const buyerIds = [...new Set((recent ?? []).map((s: any) => s.buyer_id))];
      let buyersMap: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: b } = await sb.from("buyers").select("id, name").in("id", buyerIds);
        buyersMap = Object.fromEntries((b ?? []).map((x: any) => [x.id, x.name]));
      }

      setRecentSales((recent ?? []).map((sale: any) => ({
        ...sale,
        buyer_name: buyersMap[sale.buyer_id] || "Comprador",
      })));

    } else if (userRole === 'gestor' && organization?.id) {
      const orgId = organization.id;
      const { data: raffle } = await sb
        .from("raffles")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let raffleNums: any[] = [];
      if (raffle) {
        const { data: rn } = await sb
          .from("raffle_numbers")
          .select("id, status")
          .eq("raffle_id", raffle.id);
        raffleNums = rn ?? [];
      }

      const [sales, buyers] = await Promise.all([
        sb.from("sales").select("id, buyer_id, quantity, total_cents, payment_status, created_at, seller_id").eq("organization_id", orgId).order("created_at", { ascending: false }),
        sb.from("buyers").select("id", { count: "exact" }).eq("organization_id", orgId),
      ]);

      const available = raffleNums.filter((n: any) => n.status === 'available').length;
      const sold = raffleNums.filter((n: any) => n.status === 'sold').length;
      const reserved = raffleNums.filter((n: any) => n.status === 'reserved').length;
      const totalRevenue = (sales.data ?? []).reduce((acc: number, s: any) =>
        s.payment_status === 'paid' ? acc + s.total_cents : acc, 0);

      setStats({
        totalOrgs: 1,
        totalBuyers: buyers.count ?? 0,
        available,
        sold,
        reserved,
        totalRevenue,
      });

      const buyerIds = [...new Set((sales.data ?? []).map((s: any) => s.buyer_id))];
      let buyersMap: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: b } = await sb.from("buyers").select("id, name").in("id", buyerIds);
        buyersMap = Object.fromEntries((b ?? []).map((x: any) => [x.id, x.name]));
      }

      setRecentSales((sales.data ?? []).map((sale: any) => ({
        ...sale,
        buyer_name: buyersMap[sale.buyer_id] || "Comprador",
      })));

    } else if (userRole === 'vendedor' && profile?.id) {
      const { data: sales } = await sb
        .from("sales")
        .select("id, buyer_id, quantity, total_cents, payment_status, created_at, seller_id")
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // O vendedor enxerga a grade da rifa da sua organização (RLS permite a leitura).
      let available = 0;
      let reserved = 0;
      let total = 0;
      if (organization?.id) {
        const { data: raffle } = await sb
          .from("raffles")
          .select("id")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (raffle) {
          const { data: nums } = await sb
            .from("raffle_numbers")
            .select("id, status")
            .eq("raffle_id", raffle.id);
          total = (nums ?? []).length;
          available = (nums ?? []).filter((n: any) => n.status === 'available').length;
          reserved = (nums ?? []).filter((n: any) => n.status === 'reserved').length;
        }
      }

      const buyerIds = [...new Set((sales ?? []).map((s: any) => s.buyer_id))];
      let buyersMap: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: b } = await sb.from("buyers").select("id, name").in("id", buyerIds);
        buyersMap = Object.fromEntries((b ?? []).map((x: any) => [x.id, x.name]));
      }

      const totalRevenue = (sales ?? []).reduce((acc: number, s: any) =>
        s.payment_status === 'paid' ? acc + s.total_cents : acc, 0);
      const mySold = (sales ?? []).reduce((acc: number, s: any) => acc + s.quantity, 0);

      setStats({
        totalOrgs: 1,
        totalBuyers: buyerIds.length,
        available,
        sold: mySold,
        reserved,
        totalNumbers: total,
        totalRevenue,
      });

      setRecentSales((sales ?? []).map((sale: any) => ({
        ...sale,
        buyer_name: buyersMap[sale.buyer_id] || "Comprador",
      })));
    }

    setLoading(false);
  }

  const isAdmin = userRole === 'admin';
  const isGestor = userRole === 'gestor';
  const isVendedor = userRole === 'vendedor';

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Painel" userMenu />
      <div className="px-4 py-6 space-y-5 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Painel</h1>
            <p className="text-sm text-[var(--muted)]">
              {isAdmin ? "Visão geral de todas as organizações" :
               isGestor ? `Visão da organização: ${organization?.name}` :
               "Suas vendas e números"}
            </p>
          </div>
          {!isVendedor && (
            <Link
              href="/vendas"
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
            >
              Nova venda <ShoppingCart className="size-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonStat label="Organizações" />
            <SkeletonStat label="Compradores" />
            <SkeletonStat label="Números livres" />
            <SkeletonStat label="Receita" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Organizações" value={stats.totalOrgs} icon={BarChart2} />
            <StatCard label="Compradores" value={stats.totalBuyers} icon={Ticket} />
            <StatCard label="Números livres" value={stats.available} sub={`de ${stats.totalNumbers ?? stats.sold + stats.available + stats.reserved}`} icon={Check} />
            <StatCard label="Receita" value={formatCurrency(stats.totalRevenue)} sub="Vendas pagas" icon={ShoppingCart} />
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Últimas vendas</h2>
            {!isVendedor && (
              <Link href="/vendas/historico" className="text-xs font-semibold text-[var(--ink)] hover:underline">Ver tudo</Link>
            )}
          </div>
          {loading || !stats ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-12">
              <SkeletonNumberGrid />
            </div>
          ) : recentSales.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f7f7f7]">
                  <div>
                    <p className="text-sm font-medium">{sale.buyer_name}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDateTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--ink)]">{formatCurrency(sale.total_cents)}</p>
                    <span className={`text-xs font-medium ${sale.payment_status === "paid" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                      {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
