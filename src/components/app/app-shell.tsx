"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";

const AUTH_ROUTES = ["/entrar", "/cadastro", "/confirmar-email"];

/**
 * Envolve as páginas do app com a navegação responsiva:
 * - Sidebar fixa em desktop (lg+)
 * - Espaço reservado para o header fixo e para a sidebar
 * - Rotas públicas de autenticação ficam sem navegação
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="pt-14 lg:pl-64">{children}</div>
    </>
  );
}
