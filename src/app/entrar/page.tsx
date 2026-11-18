"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, TicketCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/app/logo";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/painel");
  }, [loading, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const sb = getSupabase();
    if (!sb) {
      setError("Supabase não configurado. Verifique as variáveis de ambiente.");
      setSubmitting(false);
      return;
    }
    const { error: loginError } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);
    if (loginError) {
      setError("E-mail ou senha incorretos. Verifique os dados e tente novamente.");
      return;
    }
    router.push("/painel");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#f7f7f7] p-12 text-[var(--ink)] lg:flex lg:flex-col lg:justify-between">
        <div className="relative max-w-xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            <ShieldCheck className="size-3.5" /> Acesso interno
          </span>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.12] tracking-[-0.035em] xl:text-5xl">
            Sua rifa organizada, do primeiro número à última venda.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--muted)]">
            Controle números, cadastre compradores, acompanhe pagamentos e organize toda a equipe em um só lugar.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ["Números", "visão clara"],
              ["Vendas", "PDV rápido"],
              ["Equipe", "acesso único"],
            ].map(([title, subtitle]) => (
              <div key={title} className="rounded-lg border border-[var(--line)] bg-white p-4">
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-xs text-[var(--muted-soft)]">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[var(--muted-soft)]">Gestão privada para sua operação de rifas.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px] animate-fade-up">
          <Logo className="mb-10 lg:hidden" />
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold text-[var(--muted)] tracking-tighter uppercase">Bem-vindo de volta</p>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Acesse sua conta</h2>
            <p className="mt-2 text-[var(--muted)]">Entre para continuar o gerenciamento da sua rifa.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="E-mail" htmlFor="email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </Field>
            <Field label="Senha" htmlFor="password">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="focus-ring absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#999999] hover:bg-[#f7f7f7] hover:text-[var(--ink)]"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Entrar <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs font-medium text-[#8b9894]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            ou
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <Link
            href="/cadastro"
            className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white font-semibold shadow-sm transition hover:border-[#b9c9c5] hover:bg-[#f8faf9]"
          >
            <TicketCheck className="size-4 text-[var(--ink)]" />
            Criar minha primeira rifa
          </Link>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-bold text-[var(--ink)] hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
