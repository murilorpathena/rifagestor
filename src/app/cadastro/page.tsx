"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/app/logo";
import { getSupabase } from "@/lib/supabase";
import { getZodMessage, signupSchema } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    organization_name: "",
    raffle_title: "",
    ticket_price: "20,00",
    total_numbers: "100",
    default_numbers_per_sale: "1",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/painel");
  }, [loading, router, user]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsed = signupSchema.safeParse({
      ...form,
      ticket_price_cents: Math.round(Number(form.ticket_price.replace(",", ".")) * 100),
    });

    if (!parsed.success) {
      setError(getZodMessage(parsed.error));
      return;
    }

    setSubmitting(true);
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase não configurado. Verifique as variáveis de ambiente.");
      setSubmitting(false);
      return;
    }
    const { data, error: signupError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.full_name,
          organization_name: parsed.data.organization_name,
          raffle_title: parsed.data.raffle_title,
          ticket_price_cents: parsed.data.ticket_price_cents,
          total_numbers: parsed.data.total_numbers,
          default_numbers_per_sale: parsed.data.default_numbers_per_sale,
        },
        emailRedirectTo: `${window.location.origin}/confirmar-email`,
      },
    });

    setSubmitting(false);
    if (signupError) {
      setError(
        signupError.message.toLowerCase().includes("already registered")
          ? "Já existe uma conta com este e-mail. Tente entrar."
          : signupError.message,
      );
      return;
    }

    if (data.session) {
      router.push("/painel");
      return;
    }
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 text-center card-shadow">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--line)] bg-[#f7f7f7] text-[var(--ink)]">
            <Check className="size-7" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Confira seu e-mail</h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Enviamos um link de confirmação para <strong className="text-[var(--ink)]">{form.email}</strong>. Acesse o link para ativar sua conta e criar a rifa.
          </p>
          <Link href="/entrar" className="focus-ring mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--ink)] px-5 font-semibold text-white">
            Voltar para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <Link href="/entrar" className="focus-ring flex items-center gap-2 rounded-lg text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            <ArrowLeft className="size-4" /> Já tenho conta
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold text-[var(--muted)] tracking-tighter uppercase">Comece agora</p>
          <h1 className="text-balance text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Crie sua rifa e convide sua equipe</h1>
          <p className="mt-3 text-[var(--muted)]">Em poucos passos, você terá controle de números, vendas e pagamentos.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6 rounded-3xl border border-[var(--line)] bg-white p-5 card-shadow sm:p-8">
            <section>
              <h2 className="text-lg font-extrabold">1. Seus dados</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Usaremos estes dados para acessar o sistema.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Nome completo" htmlFor="full_name" className="sm:col-span-2">
                  <Input id="full_name" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Ex.: Maria Silva" required />
                </Field>
                <Field label="E-mail" htmlFor="email">
                  <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="voce@exemplo.com" required />
                </Field>
                <Field label="Senha" htmlFor="password">
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Mínimo de 8 caracteres" className="pr-11" required minLength={8} />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="focus-ring absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#8b9894] hover:bg-[#eef2f1]" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </section>

            <div className="h-px bg-[var(--line)]" />

            <section>
              <h2 className="text-lg font-extrabold">2. Dados da rifa</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Você poderá alterar tudo depois nas configurações.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Nome da rifa / campanha" htmlFor="organization_name" className="sm:col-span-2">
                  <Input id="organization_name" value={form.organization_name} onChange={(e) => updateField("organization_name", e.target.value)} placeholder="Ex.: Rifa Beneficente do Escola" required />
                </Field>
                <Field label="Título da rifa" htmlFor="raffle_title" className="sm:col-span-2">
                  <Input id="raffle_title" value={form.raffle_title} onChange={(e) => updateField("raffle_title", e.target.value)} placeholder="Ex.: Rifle Solidário 2026" required />
                </Field>
                <Field label="Valor por número (R$)" htmlFor="ticket_price">
                  <Input id="ticket_price" inputMode="decimal" value={form.ticket_price} onChange={(e) => updateField("ticket_price", e.target.value)} required />
                </Field>
                <Field label="Quantidade de números" htmlFor="total_numbers">
                  <Input id="total_numbers" type="number" min="1" max="100000" value={form.total_numbers} onChange={(e) => updateField("total_numbers", e.target.value)} required />
                </Field>
                <Field label="Números por venda (padrão)" htmlFor="default_numbers_per_sale" hint="O vendedor poderá alterar no PDV.">
                  <Input id="default_numbers_per_sale" type="number" min="1" max="100" value={form.default_numbers_per_sale} onChange={(e) => updateField("default_numbers_per_sale", e.target.value)} required />
                </Field>
              </div>
            </section>

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</div> : null}

            <Button type="submit" size="lg" className="w-full sm:w-auto" loading={submitting}>
              Criar conta e rifa <ArrowRight className="size-4" />
            </Button>
          </div>

          <aside className="h-fit rounded-3xl bg-[#0b3f3b] p-7 text-white lg:sticky lg:top-8">
            <h2 className="text-lg font-extrabold">Tudo o que você terá</h2>
            <div className="mt-6 space-y-5">
              {[
                ["Painel completo", "Acompanhe progresso, receita e números em tempo real."],
                ["PDV de vendas", "Registre comprador, pagamento e números em poucos segundos."],
                ["Gestão da equipe", "Convide vendedores e permita que todosVendam pela mesma rifa."],
                ["Segurança Supabase", "Login protegido e dados isolados por organização."],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[#f7f7f7] text-[var(--ink)]"><Check className="size-3.5" /></span>
                  <div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-4 text-sm leading-6 text-[var(--muted)]">
              <p><strong className="text-[var(--ink)]">Dica:</strong> o valor cadastrado aqui é apenas o padrão inicial. Ajuste-o em Configurações quando quiser.</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
