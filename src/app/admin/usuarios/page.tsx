"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, Trash2, UserCog, AlertTriangle } from "lucide-react";
import { MobileHeader } from "@/components/app/mobile-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "vendedor";
  created_at: string;
}

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  vendedor: "Vendedor",
};

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let value = "";
  for (let i = 0; i < 12; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

export default function AdminUsuariosPage() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const { organization, profile: me } = useWorkspace();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: makePassword(),
    role: "vendedor" as "admin" | "gestor" | "vendedor",
  });

  const loadUsers = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (error) showToast(error.message, "error");
    else setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setCreating(true);
    setGeneratedPassword(null);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        organization_id: organization?.id,
      },
    });

    if (error || data?.error) {
      showToast(data?.error ?? error?.message ?? "Erro ao criar usuário.", "error");
    } else {
      setGeneratedPassword(form.password);
      showToast("Usuário criado. Guarde a senha gerada!", "success");
      setForm({ full_name: "", email: "", password: makePassword(), role: "vendedor" });
      await loadUsers();
    }
    setCreating(false);
  }

  async function handleRole(user: UserRow, role: "admin" | "gestor" | "vendedor") {
    if (!supabase || user.role === role) return;
    setBusyId(user.id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
    if (error) {
      showToast(error.message, "error");
    } else {
      const memberRole = role === "vendedor" ? "member" : "owner";
      await supabase
        .from("organization_members")
        .update({ role: memberRole })
        .eq("user_id", user.id)
        .eq("organization_id", organization?.id ?? "");
      showToast("Permissão atualizada.", "success");
      await loadUsers();
    }
    setBusyId(null);
  }

  async function handleRemove(user: UserRow) {
    if (!supabase || user.id === me?.id) return;
    if (!window.confirm(`Remover o acesso de ${user.name || user.email}?`)) return;
    setBusyId(user.id);
    const { error } = await supabase.functions.invoke("create-user", {
      body: { action: "delete", user_id: user.id },
    });
    if (error) showToast(error.message, "error");
    else {
      showToast("Usuário removido.", "success");
      await loadUsers();
    }
    setBusyId(null);
  }

  async function handleResetPassword(user: UserRow) {
    if (!supabase) return;
    const password = makePassword();
    const { error } = await supabase.functions.invoke("create-user", {
      body: { action: "update_password", user_id: user.id, password },
    });
    if (error) showToast(error.message, "error");
    else {
      setGeneratedPassword(password);
      showToast("Nova senha gerada. Guarde para entregar ao usuário.", "success");
    }
  }

  async function handleReset() {
    if (!supabase) return;
    if (resetConfirm !== "RESET") {
      showToast("Digite RESET para confirmar.", "error");
      return;
    }
    setResetBusy(true);
    try {
      const { error: e1 } = await supabase.from("sale_numbers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error: e2 } = await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error: e3 } = await supabase.from("buyers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error: e4 } = await supabase
        .from("raffle_numbers")
        .update({ status: "available", sale_id: null, buyer_id: null, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      const firstError = e1 ?? e2 ?? e3 ?? e4;
      if (firstError) throw firstError;

      showToast("Vendas, compradores e números foram resetados.", "success");
      setResetConfirm("");
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao resetar vendas.", "error");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Usuários" userMenu />
      <div className="px-4 pt-16 space-y-5 pb-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Usuários e permissões</h1>
          <p className="text-sm text-[var(--muted)]">
            Crie gestores e vendedores para a rifa {organization?.name ?? ""}.
          </p>
        </div>

        {generatedPassword ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                Senha do último usuário
              </p>
              <p className="mt-1 select-all break-all font-mono text-sm font-bold">
                {generatedPassword}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Entregue ao usuário e depois feche esta tela.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" /> Novo usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 px-4 py-4">
              <Field label="Nome" htmlFor="new-name">
                <Input
                  id="new-name"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nome do vendedor"
                  required
                />
              </Field>
              <Field label="E-mail" htmlFor="new-email">
                <Input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nome@exemplo.com"
                  required
                />
              </Field>
              <Field label="Função" htmlFor="new-role">
                <Select
                  id="new-role"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "gestor" | "vendedor" }))}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Administrador</option>
                </Select>
              </Field>
              <Field label="Senha (gerada)" htmlFor="new-password">
                <Input
                  id="new-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit" loading={creating}>
                  <UserCog className="mr-2 size-4" /> Criar usuário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((p) => ({ ...p, password: makePassword() }))}
                >
                  <KeyRound className="mr-2 size-4" /> Gerar outra senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Usuários cadastrados ({users.length})</CardTitle>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[#f7f7f7]"
            >
              <RefreshCw className="size-3.5" /> Atualizar
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[var(--muted)]">Carregando...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[var(--muted)]">Nenhum usuário encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2 px-4 py-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user.name || "Usuário"}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-bold uppercase">
                        {roleLabel[user.role] ?? user.role}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {user.id !== me?.id ? (
                        <>
                          <Select
                            aria-label={`Permissão de ${user.name}`}
                            value={user.role}
                            disabled={busyId === user.id}
                            onChange={(e) => void handleRole(user, e.target.value as "admin" | "gestor" | "vendedor")}
                            className="h-9 w-auto min-w-32 text-xs"
                          >
                            <option value="vendedor">Vendedor</option>
                            <option value="gestor">Gestor</option>
                            <option value="admin">Administrador</option>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleResetPassword(user)}
                          >
                            <KeyRound className="mr-1.5 size-3.5" /> Nova senha
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[var(--danger)]"
                            disabled={busyId === user.id}
                            onClick={() => void handleRemove(user)}
                          >
                            <Trash2 className="mr-1.5 size-3.5" /> Remover
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">Sua conta</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset de vendas e números (apenas admin) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger)]">
              <AlertTriangle className="size-4" /> Reset de testes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted)] mb-3">
              Use antes de iniciar as vendas reais. Não remove usuários nem altera a configuração da rifa.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Confirme digitando RESET">
                <Input
                  id="reset-confirm"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="RESET"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={resetBusy || resetConfirm !== "RESET"}
                  onClick={() => void handleReset()}
                  className="w-full sm:w-auto"
                >
                  {resetBusy ? "Resetando..." : "Resetar tudo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </main>
  );
}
