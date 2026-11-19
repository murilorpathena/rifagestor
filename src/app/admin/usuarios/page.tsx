"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, User, ShieldCheck, Mail, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";

export default function AdminUsuariosPage() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "adm@123",
    full_name: "",
    role: "vendedor" as "admin" | "gestor" | "vendedor",
    organization_id: "",
  });
  const [orgs, setOrgs] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) return;
    loadUsers();
    loadOrgs();
  }, [supabase]);

  async function loadUsers() {
    try {
      // Buscar profiles (incluindo admin)
      const { data } = await supabase.from("profiles").select("id, name, email, role, created_at").order("created_at", { ascending: false });
      setUsers(data ?? []);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao carregar usuários.", "error");
    }
  }

  async function loadOrgs() {
    try {
      const { data } = await supabase.from("organizations").select("id, name").order("name", { ascending: true });
      setOrgs(data ?? []);
    } catch (err: any) {
      // Ignorar erro de orgs
    }
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      showToast("Supabase não configurado.", "error");
      return;
    }
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          organization_id: form.organization_id || undefined,
        },
      });

      if (error) {
        showToast(error.message ?? error ?? "Erro ao criar usuário.", "error");
        setCreating(false);
        return;
      }

      showToast("Usuário criado com sucesso!", "success");
      setForm({ email: "", password: "adm@123", full_name: "", role: "vendedor", organization_id: "" });
      await loadUsers();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar usuário.", "error");
    } finally {
      setCreating(false);
    }
  }

  const roleLabel = (r: string) => {
    switch (r) {
      case "admin": return "Administrador";
      case "gestor": return "Gestor";
      case "vendedor": return "Vendedor";
      default: return r;
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case "admin": return "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]";
      case "gestor": return "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]";
      case "vendedor": return "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]";
      default: return "text-[var(--muted)]";
    }
  };

  return (
    <main className="min-h-screen pb-24">
      <div className="px-4 py-6 space-y-5 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Gerenciar Usuários</h1>
            <p className="text-sm text-[var(--muted)]">Apenas administradores podem criar novas contas.</p>
          </div>
          <Link
            href="/painel"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
          >
            <ArrowRight className="size-3.5" /> Voltar ao painel
          </Link>
        </div>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 card-shadow">
          <h2 className="text-lg font-bold mb-4">Criar novo usuário</h2>
          <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="E-mail" htmlFor="create-email">
              <Input id="create-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="nome@exemplo.com" required />
            </Field>
            <Field label="Senha" htmlFor="create-password">
              <Input id="create-password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required />
            </Field>
            <Field label="Nome completo" htmlFor="create-name">
              <Input id="create-name" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="João da Silva" required />
            </Field>
            <Field label="Função" htmlFor="create-role">
              <Select id="create-role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))} required>
                <option value="vendedor">Vendedor</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>
            {form.role !== 'admin' && (
              <Field label="Organização" htmlFor="create-org">
                <Select id="create-org" value={form.organization_id} onChange={(e) => setForm((p) => ({ ...p, organization_id: e.target.value }))}>
                  <option value="">Escolher organização</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Button type="submit" size="lg" className="col-span-1 sm:col-span-auto" loading={creating}>
              <Plus className="mr-2 size-4" /> Criar usuário
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Usuários cadastrados</h2>
            <button
              type="button"
              onClick={loadUsers}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[#f7f7f7]"
            >
              <RefreshCw className="size-3.5" /> Atualizar
            </button>
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[#f7f7f7]">
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#e5e5e5] text-[var(--ink)] font-bold text-xs">
                      {u.name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name || "Usuário"}</p>
                      <p className="text-xs text-[var(--muted)]">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold tracking-tighter uppercase px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
