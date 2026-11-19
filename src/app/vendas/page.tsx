"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { BuyerForm } from "@/components/app/buyer-form";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  calculateSaleTotalCents,
  canFinalizeSale,
  isNumberSelectable,
  selectableNumbers,
  validSelectedNumbers,
} from "@/lib/sale";
import { Ticket, CheckCircle2, AlertTriangle, LoaderCircle, Plus, Minus, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [buyerStep, setBuyerStep] = useState<"form" | "numbers" | "confirm">("form");
  const [buyer, setBuyer] = useState<Buyer>({ name: "", cpf: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [completedBuyerName, setCompletedBuyerName] = useState("");

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
        try {
          const raw = sessionStorage.getItem("rifa:selected-numbers");
          if (raw) {
            const ids = JSON.parse(raw) as string[];
            setSelectedNumbers(new Set(ids.filter((id) => n?.some((item) => item.id === id))));
            sessionStorage.removeItem("rifa:selected-numbers");
          }
        } catch {
          sessionStorage.removeItem("rifa:selected-numbers");
        }
      }
      setLoading(false);
    })();
  }, [supabase]);

  const price = raffle?.ticket_price_cents ?? 0;
  const availableNumbers = selectableNumbers(numbers);
  const selectedList = validSelectedNumbers(numbers, selectedNumbers);
  const total = calculateSaleTotalCents(price, selectedList.length);

  const handleNumberToggle = (id: string) => {
    const item = numbers.find((n) => n.id === id);
    if (!item || !isNumberSelectable(item)) return;
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
    if (!canFinalizeSale(numbers, selectedNumbers)) {
      setError("Selecione pelo menos um número disponível.");
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
      setCompletedBuyerName(buyer.name);
      setSuccess(true);
      setBuyerStep("form");
      setSelectedNumbers(new Set());
      setBuyer({ name: "", cpf: "", email: "", whatsapp: "" });
      const nums = await supabase.from("raffle_numbers").select("id, number, status").eq("raffle_id", raffle.id).order("number", { ascending: true });
      setNumbers(nums.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao finalizar venda.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCpf = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  const paymentLabel = (method: string) => {
    switch (method) {
      case "pix": return "PIX";
      case "cash": return "Dinheiro";
      case "card": return "Cartão";
      case "other": return "Outro";
      default: return method;
    }
  };

  if (loading || !raffle) {
    return (
      <main className="min-h-screen pb-24">
        <MobileHeader title="Nova venda" />
        <div className="px-4 py-12 flex flex-col items-center justify-center min-h-[40vh]">
          <LoaderCircle className="size-8 animate-spin text-[var(--ink)]" />
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
          <Card>
            <CardHeader>
              <CardTitle>Comprador</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BuyerForm initial={buyer} onSubmit={handleBuyerSubmit} loading={submitting} />
            </CardContent>
          </Card>
        )}

        {/* Numbers selection step */}
        {buyerStep === "numbers" && (
          <>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Selecionar números</CardTitle>
                  <p className="text-xs text-[var(--muted)]">
                    {selectedList.length} de {availableNumbers.length} disponíveis
                  </p>
                </div>
                <Button size="sm" onClick={() => setBuyerStep("confirm")} disabled={selectedList.length === 0} className="hidden sm:inline">
                  Continuar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 py-3">
                  <div className="grid grid-cols-4 gap-2 px-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                    {availableNumbers.map((num) => {
                      const selected = selectedNumbers.has(num.id);
                      return (
                        <button
                          key={num.id}
                          type="button"
                          onClick={() => handleNumberToggle(num.id)}
                          className={cn(
                            "aspect-square rounded-lg border flex items-center justify-center text-xs font-medium transition disabled:opacity-30 disabled:hover:bg-none",
                            selected
                              ? "ring-2 ring-[var(--ink)] ring-offset-1 bg-[var(--ink)] text-white"
                              : "bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[#f7f7f7]",
                          )}
                        >
                          {num.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedList.length > 0 && (
                  <div className="px-4 py-3 border-t border-[var(--line)]">
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                      <span className="text-sm font-semibold">{selectedList.length} número(s)</span>
                      <span className="text-sm font-bold text-[var(--ink)]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button size="sm" variant="ghost" onClick={() => setBuyerStep("form")} className="flex items-center justify-center gap-1 px-2 w-full">
                <Minus className="size-3.5" /> Alterar comprador
              </Button>
              <Button size="sm" onClick={() => setBuyerStep("confirm")} disabled={selectedList.length === 0} className="w-full">
                Continuar <Ticket className="ml-1 size-3.5" />
              </Button>
            </div>
          </>
        )}

        {/* Confirm step */}
        {buyerStep === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle>Confirme a venda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">Comprador</span>
                    <span className="text-sm font-medium truncate">{buyer.name}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">CPF</span>
                    <span className="text-sm font-medium truncate">{buyer.cpf ? formatCpf(buyer.cpf) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">Quantidade</span>
                    <span className="text-sm font-medium">{selectedList.length} número(s)</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">Valor total</span>
                    <span className="text-sm font-bold text-[var(--ink)]">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">Pagamento</span>
                    <span className="text-sm font-medium">{paymentLabel(paymentMethod)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
                    <span className="text-sm text-[var(--muted)]">Status</span>
                    <span className={`text-xs font-medium block ${paymentStatus === "paid" ? "text-green-600" : "text-[var(--muted)]"}`}>
                      {paymentStatus === "paid" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--muted)]">Método de pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm focus:border-[var(--ink)] outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="cash">Dinheiro</option>
                      <option value="card">Cartão</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--muted)]">Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm focus:border-[var(--ink)] outline-none"
                    >
                      <option value="paid">Pago</option>
                      <option value="pending">Pendente</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="px-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
              )}

              <div className="px-4 mt-4 grid grid-cols-2 gap-3">
                <Button variant="ghost" size="sm" onClick={() => setBuyerStep("numbers")} className="flex items-center justify-center gap-1 px-2 w-full">
                  <Plus className="size-3.5" /> + número
                </Button>
                <Button size="lg" onClick={handleCompleteSale} loading={submitting} disabled={submitting} className="w-full">
                  Finalizar venda <CheckCircle2 className="ml-1 size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-full border border-[var(--line)] bg-[#f7f7f7] text-[var(--ink)]">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-extrabold">Venda realizada!</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Os números foram registrados para {completedBuyerName}.</p>
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
