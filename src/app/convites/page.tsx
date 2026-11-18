"use client";

import { useEffect, useState } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileHeader } from "@/components/app/mobile-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Mail, ShieldUser, Link as LinkIcon, Copy, X } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

export default function ConvitesPage() {
  const supabase = useClientSupabase();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from("invitations").select("id, email, role, status, created_at, expires_at").order("created_at", { ascending: false });
      setInvites(data ?? []);
    })();
  }, [supabase]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      showToast("Supabase não configurado.", "error");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_invitation", { p_email: email, p_role: role });
      if (error) throw error;
      setInviteUrl(data?.invite_url || "");
      showToast("Convite criado!", "success");
      setEmail("");
      const { data: updated } = await supabase.from("invitations").select("id, email, role, status, created_at, expires_at").order("created_at", { ascending: false });
      setInvites(updated ?? []);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar convite.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!supabase) return;
    await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
    setInvites(invites.map((i) => i.id === id ? { ...i, status: "revoked" } : i));
    showToast("Convite revogado.", "success");
  }

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    showToast("Link copiado!", "success");
  };

  return (
    <main className="min-h-screen pb-24">
      <MobileHeader title="Convites" userMenu />
      <div className="px-4 py-6 space-y-5 pb-6">
        <form onSubmit={handleInvite} className="rounded-2xl border border-[var(--line)] bg-white p-4 card-shadow space-y-4">
          <h2 className="text-lg font-bold">Convidar vendedor</h2>
          <Field label="E-mail da pessoa" htmlFor="invite-email">
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amigo@exemplo.com" required />
          </Field>
          <Field label="Função" htmlFor="invite-role">
            <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} className="focus-ring w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-sm focus:border-[var(--brand)] outline-none">
              <option value="member">Vendedor</option>
              <option value="owner">Proprietário</option>
            </select>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            <ShieldUser className="mr-2 size-4" /> Enviar convite
          </Button>
        </form>

        {inviteUrl && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] p-4 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[var(--brand-dark)]">Link do convite</h2>
              <Button size="sm" variant="ghost" onClick={copy}>
                <Copy className="size-4" /> Copiar
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
              <LinkIcon className="size-4 text-[var(--brand)]" />
              <span className="flex-1 truncate">{inviteUrl}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">Envie este link por WhatsApp. A pessoa precisará criar a conta com o mesmo e-mail convidado.</p>
          </div>
        )}

        <h2 className="text-lg font-bold">Convites enviados</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">Nenhum convite enviado ainda.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-[var(--line)] bg-white p-3 card-shadow">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{inv.email}</p>
                  <span className={`text-xs font-bold rounded-full border px-2 py-0.5 ${inv.status === "pending" ? "border-[#c7c7c7] text-[var(--muted)] bg-[#f7f7f7]" : "border-green-100 text-[var(--ink)] bg-[#f7f7f7]"}`}>
                    {inv.status === "pending" ? "Pendente" : inv.status === "accepted" ? "Aceito" : "Revogado"}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{inv.role === "owner" ? "Proprietário" : "Vendedor"} • expira em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}</p>
                {inv.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => revoke(inv.id)}
                    className="mt-2 inline-block text-xs font-bold text-red-600 hover:underline"
                  >
                    Revogar convite
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
