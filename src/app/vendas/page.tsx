"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { BuyerForm } from "@/components/app/buyer-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import {
  calculateSaleTotalCents,
  canFinalizeSale,
  isNumberSelectable,
  selectableNumbers,
  validSelectedNumbers,
} from "@/lib/sale";
import { Ticket, CheckCircle2, AlertTriangle, LoaderCircle, Plus, Minus, Search, Paperclip, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/providers/toast-provider";

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
  const { showToast } = useToast();
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
  const [autoMode, setAutoMode] = useState(false);
  const [autoQuantity, setAutoQuantity] = useState(1);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);

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

  const handleAutoSelect = () => {
    if (!autoMode || autoQuantity <= 0) return;
    const availableIds = availableNumbers.map((n) => n.id);
    const alreadySelected = new Set(selectedNumbers);
    const remaining = availableIds.filter((id) => !alreadySelected.has(id));

    const shuffled = remaining.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const toSelect = shuffled.slice(0, autoQuantity);

    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      toSelect.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBuyerSubmit = (data: Buyer) => {
    setBuyer(data);
    setBuyerStep("numbers");
  };

  const handleComprovanteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione apenas arquivos de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setComprovanteFile(file);
    setComprovantePreview(URL.createObjectURL(file));
    setError("");
  };

  const removeComprovante = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    if (comprovantePreview) URL.revokeObjectURL(comprovantePreview);
  };

  const uploadComprovante = async (saleId: string): Promise<string | null> => {
    if (!supabase || !comprovanteFile) return null;
    const sb = supabase;
    setUploadingComprovante(true);
    try {
      const fileName = `${saleId}/${Date.now()}-${comprovanteFile.name}`;
      const { error: uploadError } = await sb.storage
        .from("comprovantes")
        .upload(fileName, comprovanteFile, { cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: urlData } = sb.storage
        .from("comprovantes")
        .getPublicUrl(fileName);

      return urlData?.publicUrl ?? null;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao fazer upload do comprovante.");
      return null;
    } finally {
      setUploadingComprovante(false);
    }
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
      const { error: rpcError, data: saleId } = await supabase.rpc("create_sale", {
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

      let comprovanteUrl: string | null = null;
      if (comprovanteFile && saleId) {
        comprovanteUrl = await uploadComprovante(saleId);
        if (comprovanteUrl) {
          await supabase
            .from("sales")
            .update({ comprovante_url: comprovanteUrl })
            .eq("id", saleId);
        }
      }

      setCompletedBuyerName(buyer.name);
      setCurrentSaleId(saleId);
      setSuccess(true);
      setBuyerStep("form");
      setSelectedNumbers(new Set());
      setBuyer({ name: "", cpf: "", email: "", whatsapp: "" });
      setComprovanteFile(null);
      setComprovantePreview(null);
      const nums = await supabase.from("raffle_numbers").select("id, number, status").eq("raffle_id", raffle.id).order("number", { ascending: true });
      setNumbers(nums.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao finalizar venda.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!supabase || !currentSaleId) return;
    setSendingTelegram(true);
    setError("");
    try {
      const { error } = await supabase.functions.invoke("send-telegram", {
        body: { sale_id: currentSaleId },
      });
      if (error) throw error;
      showToast("Notificação enviada ao Telegram com sucesso!", "success");
      setSendingTelegram(false);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar notificação para o Telegram.");
      setSendingTelegram(false);
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
        <div className="px-4 pt-16 pb-6 flex flex-col items-center justify-center min-h-[40vh]">
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
      <div className="px-4 pt-12 pb-6 space-y-5">
        {/* Buyer form step */}
        {buyerStep === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="size-4" /> Comprador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BuyerForm initial={buyer} onSubmit={handleBuyerSubmit} loading={submitting} />
            </CardContent>
          </Card>
        )}

        {/* Numbers selection step */}
        {buyerStep === "numbers" && (
          <>
            {/* HEADER DO TOPO: comprador, resumo e botoes */}
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <CardTitle>Selecionar números</CardTitle>
                    <p className="text-xs text-[var(--muted)]">
                      {selectedList.length} de {availableNumbers.length} disponíveis
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" onClick={() => setBuyerStep("form")} className="w-full sm:w-auto">
                      <Minus className="mr-1.5 size-3.5" /> Alterar comprador
                    </Button>
                    <Button size="sm" onClick={() => setBuyerStep("confirm")} disabled={selectedList.length === 0} className="w-full sm:w-auto bg-[var(--ink)] text-white">
                      Continuar <Ticket className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Resumo de selecao no topo */}
                {selectedList.length > 0 && (
                  <div className="mt-3 border-t border-[var(--line)] pt-3">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#f7f7f7] rounded-lg">
                      <span className="text-sm font-semibold">{selectedList.length} número(s) selecionado(s)</span>
                      <span className="text-sm font-bold text-[var(--ink)]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {/* Modo automático / sortear números */}
                <div className="px-4 py-3 border-b border-[var(--line)]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={autoMode}
                        onChange={() => setAutoMode(!autoMode)}
                        className="rounded border-[var(--line)] text-[var(--ink)] focus:ring-[var(--ink)]"
                      />
                      <span>Modo automático (sortear números)</span>
                    </label>
                    {autoMode && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={availableNumbers.length}
                          value={autoQuantity}
                          onChange={(e) => setAutoQuantity(Math.max(1, Math.min(availableNumbers.length, Number(e.target.value) || 1)))}
                          placeholder="Qtd."
                          className="w-16 text-xs"
                          disabled={autoQuantity >= availableNumbers.length}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAutoSelect()}
                          disabled={autoQuantity >= availableNumbers.length || selectedList.length >= availableNumbers.length}
                        >
                          Sortear
                        </Button>
                      </div>
                    )}
                  </div>
                  {autoMode && autoQuantity > 0 && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {autoQuantity} número(s) serão sorteados entre os {availableNumbers.length} disponíveis.
                    </p>
                  )}
                </div>

                <div className="px-4 py-3">
                  <div className="grid grid-cols-4 gap-2 px-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                    {availableNumbers.map((num) => {
                      const selected = selectedNumbers.has(num.id);
                      return (
                        <button
                          key={num.id}
                          type="button"
                          onClick={() => handleNumberToggle(num.id)}
                          disabled={autoMode && selectedList.length >= autoQuantity && !selected}
                          className={cn(
                            "aspect-square rounded-lg border flex items-center justify-center text-xs font-medium transition disabled:opacity-30 disabled:hover:bg-none disabled:hover:text-none",
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
              </CardContent>
            </Card>
          </>
        )}

        {/* Confirm step */}
        {buyerStep === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="size-4" /> Confirme a venda
              </CardTitle>
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
                    <span className={`text-xs font-medium block ${paymentStatus === "paid" ? "text-green-600" : paymentStatus === "pending" ? "text-amber-600" : "text-[var(--muted)]"}`}>
                      {paymentStatus === "paid" ? "Pago" : paymentStatus === "pending" ? "Pendente" : "Cancelado"}
                    </span>
                  </div>
                </div>

                {/* Upload de comprovante */}
                <div className="space-y-3 pt-1">
                  <label className="text-sm font-medium text-[var(--muted)]">Comprovante de pagamento</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleComprovanteChange}
                      className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--line)] file:text-[var(--ink)] hover:file:bg-[#f7f7f7]"
                    />
                    {comprovantePreview && (
                      <div className="relative">
                        <img
                          src={comprovantePreview}
                          alt="Comprovante"
                          className="w-24 h-24 rounded-lg border border-[var(--line)] object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeComprovante}
                          className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 hover:bg-red-600"
                          aria-label="Remover comprovante"
                        >
                          <span className="text-white text-[10px]">×</span>
                        </button>
                      </div>
                    )}
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
                <Button size="lg" onClick={handleCompleteSale} loading={submitting || uploadingComprovante} disabled={submitting || uploadingComprovante} className="w-full bg-[var(--ink)] text-white">
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

            {currentSaleId && (
              <div className="mt-6 w-full max-w-xs">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-[var(--muted)] mb-3">Notificar no Telegram</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSendTelegram}
                        loading={sendingTelegram}
                        disabled={sendingTelegram}
                        className="flex-1 bg-[var(--ink)] text-white"
                      >
                        <Bot className="mr-2 size-3.5" /> Enviar para o Telegram
                      </Button>
                    </div>
                    {comprovantePreview && (
                      <div className="mt-3">
                        <p className="text-xs text-[var(--muted)] mb-1">Comprovante anexado:</p>
                        <img
                          src={comprovantePreview}
                          alt="Comprovante"
                          className="w-20 h-20 rounded-lg border border-[var(--line)] object-cover"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Button size="lg" className="mt-6 w-full bg-[var(--ink)] text-white" onClick={() => {
              setSuccess(false);
              setBuyerStep("form");
              setBuyer({ name: "", cpf: "", email: "", whatsapp: "" });
              setSelectedNumbers(new Set());
              setCurrentSaleId(null);
              setComprovanteFile(null);
              setComprovantePreview(null);
            }}>Nova venda</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
