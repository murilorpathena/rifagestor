"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { BuyerForm } from "@/components/app/buyer-form";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Ticket, CheckCircle2, AlertTriangle, LoaderCircle, Plus, Minus, Search } from "lucide-react";

interface NumberItem {
  id: string;
  number: number;
  status: string;
}

interface Buyer {
  name: string;
  cpf: string;
  email: string;
  whatsapp: string;
}

export default function VendasPage() {
  const supabase = useClientSupabase();
  const [raffle, setRaffle] = useState<any>(null);
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [buyerStep, setBuyerStep] = useState<"form" | "numbers" | "confirm">("form");
  const [buyer, setBuyer] = useState<Buyer>({ name: "", cpf: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError("Supabase não configurado.");
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership?.organization_id) return;

      const { data: r } = await supabase
        .from("raffles")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setRaffle(r);
      if (r) {
        const { data: n } = await supabase
          .from("raffle_numbers")
          .select("id, number, status")
          .eq("raffle_id", r.id)
          .order("number", { ascending: true });
        setNumbers(n ?? []);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const price = raffle?.ticket_price_cents ?? 0;
  const availableNumbers = numbers.filter((n) => n.status === "available");
  const selectedList = numbers.filter((n) => selectedNumbers.has(n.id));
  const total = price * selectedList.length;

  const handleNumberToggle = (id: string) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBuyerSubmit = (data: Buyer) => {
    setBuyer(data);
    setBuyerStep("numbers");
  };

  const handleCompleteSale = async () => {
    if (!supabase) {
      setError("Supabase não configurado.");
      return;
    }
    if (selectedList.length === 0) {
      setError("Selecione pelo menos um número.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("create_sale", {
        p_raffle_id: raffle.id,
        p_buyer_name: buyer.name,
        p_buyer_cpf: buyer.cpf,
        p_buyer_email: buyer.email || null,
        p_buyer_whatsapp: buyer.whatsapp,
        p_quantity: selectedList.length,
        p_number_ids: selectedList.map((n) => n.id),
        p_payment_method: paymentMethod,
        p_payment_status: paymentStatus,
        p_notes: null,
      });
      if (rpcError) throw rpcError;
      setSuccess(true);
      setBuyerStep("form");
      setSelectedNumbers(new Set());
      setBuyer({ name: "", cpf: "", email: "", whatsapp: "" });
      // Refresh numbers
      const nums = await supabase.from("raffle_numbers").select("id, number, status").eq("raffle_id", raffle.id).order("number", { ascending: true });
      setNumbers(nums.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao finalizar venda.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !raffle) {
    return (
      <main className="min-h-screen pb-24">
        <MobileHeader title="Nova venda" />
        <div className="px-4 py-12 flex flex-col items-center justify-center min-h-[40vh]">
          <LoaderCircle className="size-8 animate-spin text-[var(--brand)]" />
          <p className="mt-3 text-sm text-[var(--muted)]">Carregando números...</p>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Nova venda" />
      <div className="px-4 pb-6 space-y-5">
        {/* Buyer form step */}
        {buyerStep === "form" && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
            <h2 className="text-lg font-bold mb-3">Comprador</h2>
            <BuyerForm initial={buyer} onSubmit={handleBuyerSubmit} loading={submitting} />
          </section>
        )}

        {/* Numbers selection step */}
        {buyerStep === "numbers" && (
          <>
            <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold">Selecionar números</h2>
                  <p className="text-xs text-[var(--muted)]">{selectedList.length} de {availableNumbers.length} disponíveis</p>
                </div>
                <Button size="sm" onClick={() => setBuyerStep("confirm")} disabled={selectedList.length === 0} className="hidden sm:inline">
                  Continuar
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 px-1 max-w-[460px] mx-auto">
                {availableNumbers.map((num) => {
                  const selected = selectedNumbers.has(num.id);
                  return (
                    <button
                      key={num.id}
                      type="button"
                      onClick={() => handleNumberToggle(num.id)}
                      className={`
                        aspect-square rounded-xl border-2 flex items-center justify-center text-xs font-bold transition
                        ${selected ? "ring-2 ring-[var(--brand)] ring-offset-1 bg-[var(--brand)] text-white" : "bg-white text-[var(--foreground)] border-[var(--line)]"}
                      `}
                    >
                      {num.number}
                    </button>
                  );
                })}
              </div>

              {selectedList.length > 0 && (
                <div className="mt-4 px-2">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                    <span className="text-sm font-semibold">{selectedList.length} número(s)</span>
                    <span className="text-sm font-bold text-[var(--brand)]">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-3">
              <Button size="sm" variant="ghost" onClick={() => setBuyerStep("form")} className="flex items-center justify-center gap-1 px-2">
                <Minus className="size-3.5" /> Alterar comprador
              </Button>
              <Button size="sm" onClick={() => setBuyerStep("confirm")} disabled={selectedList.length === 0}>
                Continuar <Ticket className="ml-1 size-3.5" />
              </Button>
            </div>
          </>
        )}

        {/* Confirm step */}
        {buyerStep === "confirm" && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow">
            <h2 className="text-lg font-bold mb-3">Confirme a venda</h2>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">Comprador</span>
                <span className="text-sm font-medium">{buyer.name}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">CPF</span>
                <span className="text-sm font-medium">{buyer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">Quantidade</span>
                <span className="text-sm font-medium">{selectedList.length} número(s)</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">Valor total</span>
                <span className="text-sm font-bold text-[var(--brand)]">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">Pagamento</span>
                <span className="text-sm font-medium">
                  {paymentMethod === "pix" ? "PIX" : paymentMethod === "cash" ? "Dinheiro" : paymentMethod === "card" ? "Cartão" : "Outro"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[#f8faf9]">
                <span className="text-sm text-[var(--muted)]">Status</span>
                <span className={`text-xs font-medium ${paymentStatus === "paid" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                  {paymentStatus === "paid" ? "Pago" : "Pendente"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">Método de pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm focus:border-[var(--brand)] outline-none">
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">Status</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm focus:border-[var(--brand)] outline-none">
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="ghost" size="sm" onClick={() => setBuyerStep("numbers")} className="flex items-center justify-center gap-1 px-2">
                <Plus className="size-3.5" /> + número
              </Button>
              <Button size="lg" onClick={handleCompleteSale} loading={submitting} disabled={submitting}>
                Finalizar venda <CheckCircle2 className="ml-1 size-3.5" />
              </Button>
            </div>
          </section>
        )}

        {success && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-full border border-[var(--line)] bg-[#f7f7f7] text-[var(--ink)]">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-extrabold">Venda realizada!</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Os números foram registrados para {buyer.name}.</p>
            <Button size="lg" className="mt-6 w-full" onClick={() => {
              setSuccess(false);
              setBuyerStep("form");
              setBuyer({ name: "", cpf: "", email: "", whatsapp: "" });
              setSelectedNumbers(new Set());
            }}>Nova venda</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
