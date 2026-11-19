"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";
import { BarChart2, ShoppingCart, Ticket, Plus } from "lucide-react";

/** Navegação inferior fixa para mobile/tablet (oculta em desktop).
 * Apenas 3 itens: Painel (esquerda), Nova venda (+ no centro) e Números (direita).
 * Todos os demais itens ficam no drawer do menu mobile. */
export function BottomNav() {
  const pathname = usePathname();
  const { userRole } = useWorkspace();

  const isVendedor = userRole === "vendedor";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] flex w-full items-center justify-between rounded-t-xl border-t border-[var(--line)] bg-white p-2 px-3 shadow-sm lg:hidden">
      {/* Esquerda: Painel */}
      <Link
        href="/painel"
        className={cn(
          "focus-ring flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-medium transition",
          pathname === "/painel" ? "text-[var(--ink)]" : "text-[var(--muted-soft)]",
        )}
      >
        <BarChart2 className={cn("size-5", pathname === "/painel" ? "text-[var(--ink)]" : "")} />
        <span className="whitespace-nowrap">Painel</span>
      </Link>

      {/* Centro: Nova venda (botão +) */}
      <Link
        href="/vendas"
        className={cn(
          "focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-white shadow-md transition active:scale-95",
          pathname === "/vendas" ? "ring-2 ring-[var(--ink)] ring-offset-2" : "",
        )}
        aria-label="Nova venda"
      >
        <Plus className="size-5" />
      </Link>

      {/* Direita: Números */}
      <Link
        href="/numeros"
        className={cn(
          "focus-ring flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-medium transition",
          pathname === "/numeros" ? "text-[var(--ink)]" : "text-[var(--muted-soft)]",
        )}
      >
        <Ticket className={cn("size-5", pathname === "/numeros" ? "text-[var(--ink)]" : "")} />
        <span className="whitespace-nowrap">Números</span>
      </Link>
    </nav>
  );
}
