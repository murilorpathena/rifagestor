"use client";

import { useCallback, useState } from "react";
import { LogOut, Mail, ShieldCheck, ShieldAlert, Key } from "lucide-react";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  vendedor: "Vendedor",
  owner: "Gestor",
  member: "Vendedor",
};

export default function PerfilContent() {
  const supabase = useClientSupabase();
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { profile, organization, userRole, loading } = useWorkspace();

  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSaveName = useCallback(async () => {
    if (!supabase || !profile) return;
    if (!name.trim()) {
      showToast("Informe o nome.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (error) throw error;
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", profile.id);
      if (dbError) throw dbError;
      showToast("Nome atualizado.", "success");
      setEditingName(false);
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao atualizar o nome.", "error");
    } finally {
      setSaving(false);
    }
  }, [supabase, profile, name, showToast]);

  const handleSaveEmail = useCallback(async () => {
    if (!supabase || !profile) return;
    if (!email.trim()) {
      showToast("Informe o e-mail.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ email: email.trim() })
        .eq("id", profile.id);
      if (dbError) throw dbError;
      showToast("E-mail atualizado. Verifique sua caixa de entrada para confirmar.", "success");
      setEditingEmail(false);
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao atualizar o e-mail.", "error");
    } finally {
      setSaving(false);
    }
  }, [supabase, profile, email, showToast]);

  const handleSavePassword = useCallback(async () => {
    if (!supabase) return;
    if (password.length < 6) {
      showToast("A senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("As senhas não coincidem.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      showToast("Senha atualizada.", "success");
      setEditingPassword(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao atualizar a senha.", "error");
    } finally {
      setSaving(false);
    }
  }, [supabase, password, confirmPassword, showToast]);

  if (loading) {
    return (
      <main className="min-h-screen pb-24">
        <MobileHeader title="Meu perfil" userMenu />
        <div className="px-4 pt-16 space-y-5">
          <h1 className="text-xl font-extrabold tracking-tight">Perfil</h1>
          <p className="py-10 text-center text-sm text-[var(--muted)]">Carregando perfil...</p>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Meu perfil" userMenu />
      <div className="px-4 pt-16 space-y-5">
        <h1 className="text-xl font-extrabold tracking-tight">Perfil</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4" /> Dados da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-[#f7f7f7] text-lg font-extrabold">
                {profile?.name?.[0] ?? "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{profile?.name ?? "Usuário"}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
                  <Mail className="size-3.5" /> {profile?.email ?? "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
                <p className="text-xs text-[var(--muted)]">Organização</p>
                <p className="text-sm font-medium">{organization?.name ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-3">
                <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <ShieldCheck className="size-3.5" /> Função
                </p>
                <p className="text-sm font-bold">{roleLabels[userRole ?? ""] ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edição de dados pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" /> Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {editingName ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleSaveName(); }} className="grid gap-3 p-4">
                <Field label="Nome">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    defaultValue={profile?.name ?? ""}
                    required
                    autoFocus
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <Button type="submit" loading={saving} size="sm">
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingName(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2 p-4">
                <span className="text-sm text-[var(--muted)]">Nome</span>
                <button
                  type="button"
                  onClick={() => { setName(profile?.name ?? ""); setEditingName(true); }}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
                >
                  <ShieldAlert className="size-3.5" /> Editar
                </button>
              </div>
            )}

            {editingEmail ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleSaveEmail(); }} className="grid gap-3 mt-4 border-t pt-4 p-4">
                <Field label="E-mail">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    defaultValue={profile?.email ?? ""}
                    required
                    autoFocus
                  />
                </Field>
                <p className="text-xs text-[var(--muted)]">
                  Um e-mail de confirmação será enviado para o novo endereço.
                </p>
                <div className="flex items-center gap-2">
                  <Button type="submit" loading={saving} size="sm">
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingEmail(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2 mt-4 border-t pt-4 p-4">
                <span className="text-sm text-[var(--muted)]">E-mail</span>
                <button
                  type="button"
                  onClick={() => { setEmail(profile?.email ?? ""); setEditingEmail(true); }}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
                >
                  <ShieldAlert className="size-3.5" /> Editar
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edição de senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-4" /> Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {editingPassword ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleSavePassword(); }} className="grid gap-3 p-4">
                <Field label="Nova senha">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoFocus
                  />
                </Field>
                <Field label="Confirme a nova senha">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <Button type="submit" loading={saving} size="sm">
                    Salvar senha
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingPassword(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2 p-4">
                <span className="text-sm text-[var(--muted)]">Senha</span>
                <button
                  type="button"
                  onClick={() => setEditingPassword(true)}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
                >
                  <Key className="size-3.5" /> Alterar senha
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              className="focus-ring w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-semibold text-[var(--danger)] transition hover:bg-red-100"
              onClick={() => void signOut()}
            >
              <LogOut className="mr-2 size-4" /> Sair da conta
            </button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </main>
  );
}
