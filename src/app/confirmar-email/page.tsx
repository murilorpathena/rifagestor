"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = new URLSearchParams(window.location.search).get("code");
    const errorDescription = hash.get("error_description") || new URLSearchParams(window.location.search).get("error_description");

    if (errorDescription) {
      setStatus("error");
      return;
    }

    if (code) {
      import("@/lib/supabase").then(({ getSupabase }) => {
        const sb = getSupabase();
        if (!sb) {
          setStatus("error");
          return;
        }
        void sb.auth.exchangeCodeForSession(code).then(({ error }) => {
          setStatus(error ? "error" : "success");
          if (!error) window.setTimeout(() => router.replace("/painel"), 1200);
        });
      });
      return;
    }

    window.setTimeout(() => setStatus("success"), 600);
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 text-center card-shadow">
        {status === "loading" ? (
          <>
            <LoaderCircle className="mx-auto size-12 animate-spin text-[var(--ink)]" />
            <h1 className="mt-6 text-2xl font-extrabold">Confirmando sua conta...</h1>
            <p className="mt-3 text-[var(--muted)]">Estamos validando o link enviado para o seu e-mail.</p>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="mx-auto size-12 text-[var(--ink)]" />
            <h1 className="mt-6 text-2xl font-extrabold">Conta confirmada!</h1>
            <p className="mt-3 text-[var(--muted)]">Sua rifa foi criada. Estamos levando você ao painel.</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-12 text-red-600" />
            <h1 className="mt-6 text-2xl font-extrabold">Não foi possível confirmar</h1>
            <p className="mt-3 text-[var(--muted)]">O link pode ter expirado ou já ter sido utilizado. Tente entrar na sua conta.</p>
            <Button className="mt-6" onClick={() => router.push("/entrar")}>Ir para o login</Button>
          </>
        )}
        {status !== "loading" ? <Link href="/entrar" className="focus-ring mt-4 inline-block rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:underline">Voltar ao login</Link> : null}
      </div>
    </main>
  );
}
