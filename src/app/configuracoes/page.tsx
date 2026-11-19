"use client";

import { useEffect, useState } from "react";
import { Save, Ticket, Lock } from "lucide-react";
import { MobileHeader } from "@/components/app/mobile-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const { raffle, canManage, refresh, loading: wsLoading } = useWorkspace();

  const [form, setForm] = useState({
    title: "",
    description: "",
    prize: "",
    draw_date: "",
    price_reais: "",
    total_numbers: "100",
    default_numbers_per_sale: "1",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!raffle) return;
    setForm({
      title: raffle.title ?? "",
      description: raffle.description ?? "",
      prize: raffle.prize ?? "",
      draw_date: raffle.draw_date ? toLocalDateTimeInput(raffle.draw_date) : "",
      price_reais: (raffle.ticket_price_cents / 100).toFixed(2).replace(".", ","),
      total_numbers: String(raffle.total_numbers),
      default_numbers_per_sale: String(raffle.default_numbers_per_sale),
      status: raffle.status,
    });
  }, [raffle]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !raffle) return;

    const priceCents = Math.round(Number(form.price_reais.replace(/\./g, "").replace(",", ".")) * 100);
    const total = Number(form.total_numbers);
    const perSale = Number(form.default_numbers_per_sale);

    if (!form.title.trim()) {
      showToast("Informe o título da rifa.", "error");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 100) {
      showToast("O preço por número deve ser de pelo menos R$ 1,00.", "error");
      return;
    }
    if (!Number.isInteger(total) || total < 1 || total > 100000) {
      showToast("Total de números inválido (1 a 100000).", "error");
      return;
    }
    if (!Number.isInteger(perSale) || perSale < 1 || perSale > total) {
      showToast("Quantidade por venda inválida.", "error");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("raffles")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        prize: form.prize.trim() || null,
        draw_date: form.draw_date ? new Date(form.draw_date).toISOString() : null,
        ticket_price_cents: priceCents,
        total_numbers: total,
        default_numbers_per_sale: perSale,
        status: form.status,
      })
      .eq("id", raffle.id);

    if (error) {
      showToast(error.message, "error");
    } else {
      const { error: numbersError } = await supabase.rpc("ensure_raffle_numbers", {
        p_raffle_id: raffle.id,
        p_total: total,
      });
      if (numbersError) {
        showToast(`Rifa salva, mas a grade não foi atualizada: ${numbersError.message}`, "error");
      } else {
        showToast("Configurações salvas.", "success");
      }
      await refresh();
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Rifa" userMenu />
      <div className="px-4 pt-16 space-y-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Configurações da rifa</h1>
          <p className="text-sm text-[var(--muted)]">
            Nome, prêmio, preço e total de números.
          </p>
        </div>

        {!canManage ? (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">Somente o administrador e o gestor podem alterar estes dados.</p>
            </CardContent>
          </Card>
        ) : null}

        {wsLoading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">Carregando rifa...</p>
            </CardContent>
          </Card>
        ) : !raffle ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">Nenhuma rifa configurada.</p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="size-4" /> Dados da rifa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-3 sm:grid-cols-2 px-4 py-4">
                  <Field label="Título" htmlFor="rifle-title" className="sm:col-span-2">
                    <Input
                      id="rifle-title"
                      value={form.title}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </Field>
                  <Field label="Prêmio" htmlFor="rifle-prize" className="sm:col-span-2">
                    <Input
                      id="rifle-prize"
                      value={form.prize}
                      disabled={!canManage}
                      placeholder="Ex.: R$ 500,00 em vale-compras"
                      onChange={(e) => setForm((p) => ({ ...p, prize: e.target.value }))}
                    />
                  </Field>
                  <Field label="Descrição" htmlFor="rifle-description" className="sm:col-span-2">
                    <Textarea
                      id="rifle-description"
                      value={form.description}
                      disabled={!canManage}
                      rows={3}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </Field>
                  <Field label="Data do sorteio" htmlFor="rifle-date">
                    <Input
                      id="rifle-date"
                      type="datetime-local"
                      value={form.draw_date}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, draw_date: e.target.value }))}
                    />
                  </Field>
                  <Field label="Status" htmlFor="rifle-status">
                    <Select
                      id="rifle-status"
                      value={form.status}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Aberta para vendas</option>
                      <option value="draft">Rascunho</option>
                      <option value="closed">Encerrada</option>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Números e preço</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-3 sm:grid-cols-3 px-4 py-4">
                  <Field label="Preço por número (R$)" htmlFor="rifle-price">
                    <Input
                      id="rifle-price"
                      inputMode="decimal"
                      value={form.price_reais}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, price_reais: e.target.value }))}
                    />
                  </Field>
                  <Field label="Total de números" htmlFor="rifle-total">
                    <Input
                      id="rifle-total"
                      type="number"
                      min={1}
                      max={100000}
                      value={form.total_numbers}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, total_numbers: e.target.value }))}
                    />
                  </Field>
                  <Field label="Números por venda" htmlFor="rifle-per-sale">
                    <Input
                      id="rifle-per-sale"
                      type="number"
                      min={1}
                      value={form.default_numbers_per_sale}
                      disabled={!canManage}
                      onChange={(e) => setForm((p) => ({ ...p, default_numbers_per_sale: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="px-4 py-3 border-t border-[var(--line)]">
                  <p className="text-xs text-[var(--muted)]">
                    Ao aumentar o total, novos números são criados. Ao diminuir, apenas números disponíveis são removidos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {canManage ? (
              <div className="flex justify-end">
                <Button type="submit" size="lg" loading={saving}>
                  <Save className="mr-2 size-4" /> Salvar configurações
                </Button>
              </div>
            ) : null}
          </form>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
