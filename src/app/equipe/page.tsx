"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { MobileHeader } from "@/components/app/mobile-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TeamRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: { id: string; name: string; email: string; role: string } | null;
  sales_count: number;
}

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let value = "";
  for (let i = 0; i < 12; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

export default function EquipePage() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const { organization, canManage, profile: me } = useWorkspace();

  const [members, setMembers] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState(makePassword());
  const [form, setForm] = useState({ name: "", email: "" });

  const load = useCallback(async () => {
    if (!supabase || !organization?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true });

    if (error) {
      showToast(error.message, "error");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as any[];
    const userIds = rows.map((m) => m.user_id);

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profilesById: Record<string, any> = Object.fromEntries(
      (profilesData ?? []).map((p: any) => [p.id, p]),
    );

    let counts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: sales } = await supabase
        .from("sales")
        .select("seller_id")
        .in("seller_id", userIds);
      for (const sale of sales ?? []) {
        counts[(sale as any).seller_id] = ((counts[(sale as any).seller_id] ?? 0) + 1);
      }
    }

    setMembers(
      rows.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        profile: profilesById[m.user_id] ?? null,
        sales_count: counts[m.user_id] ?? 0,
      })),
    );
    setLoading(false);
  }, [supabase, organization?.id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: form.email.trim(),
        password,
        full_name: form.name.trim(),
        role: "vendedor",
        organization_id: organization?.id,
      },
    });

    if (error || data?.error) {
      showToast(data?.error ?? error?.message ?? "Erro ao criar vendedor.", "error");
    } else {
      showToast("Vendedor criado. Entregue a senha gerada a ele.", "success");
      setForm({ name: "", email: "" });
      setPassword(makePassword());
      setShowForm(false);
      await load();
    }
    setCreating(false);
  }

  async function handleRemove(member: TeamRow) {
    if (!supabase || member.user_id === me?.id) return;
    if (!window.confirm(`Remover ${member.profile?.name ?? "este vendedor"} da equipe?`)) return;
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", member.id);
    if (error) showToast(error.message, "error");
    else {
      showToast("Membro removido da rifa.", "success");
      await load();
    }
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Equipe" userMenu />
      <div className="px-4 pt-14 space-y-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Equipe de vendas</h1>
            <p className="text-sm text-[var(--muted)]">
              Quem pode vender e acompanhar os números desta rifa.
            </p>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1.5 size-4" /> Novo
            </Button>
          ) : null}
        </div>

        {showForm && canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar vendedor</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 px-4 py-4">
                <Field label="Nome" htmlFor="team-name">
                  <Input
                    id="team-name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nome do vendedor"
                    required
                  />
                </Field>
                <Field label="E-mail" htmlFor="team-email">
                  <Input
                    id="team-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="vendedor@exemplo.com"
                    required
                  />
                </Field>
                <Field label="Senha gerada" htmlFor="team-password" className="sm:col-span-2">
                  <Input
                    id="team-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </Field>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button type="submit" loading={creating} className="w-full sm:w-auto">
                    <UserRound className="mr-2 size-4" /> Criar vendedor
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setPassword(makePassword())}>
                    Gerar outra senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">Carregando equipe...</p>
            </CardContent>
          </Card>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">
                Nenhum membro nesta rifa. Use "Novo" para cadastrar vendedores.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7f7f7] text-sm font-bold">
                        {member.profile?.name?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{member.profile?.name ?? "Usuário"}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{member.profile?.email ?? "—"}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--line)] bg-[#f7f7f7] px-2 py-0.5 text-[10px] font-bold uppercase">
                      {member.profile?.role === "gestor" || member.role === "owner" ? "Gestor" : "Vendedor"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                    <span className="text-xs text-[var(--muted)]">{member.sales_count} venda(s)</span>
                    {canManage && member.user_id !== me?.id ? (
                      <button
                        type="button"
                        onClick={() => void handleRemove(member)}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--danger)] hover:bg-red-50 w-full sm:w-auto"
                      >
                        <Trash2 className="mr-1.5 size-3.5" /> Remover
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
