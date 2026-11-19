"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Ticket, ShoppingCart, Users, Settings, ShieldUser, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const adminItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/admin/usuarios", label: "Usuários", icon: ShieldUser },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const gestorItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/numeros", label: "Números", icon: Ticket },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/equipe", label: "Vendedores", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const vendedorItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/vendas/historico", label: "Minhas Vendas", icon: CreditCard },
  { href: "/numeros", label: "Meus Números", icon: Ticket },
];

export function BottomNav() {
  const pathname = usePathname();
  const { userRole, membership } = useWorkspace();

  let items: NavItem[];
  if (userRole === 'admin') {
    items = adminItems;
  } else if (userRole === 'gestor' || (membership && membership.role === 'owner')) {
    items = gestorItems;
  } else {
    items = vendedorItems;
  }

  return (
    <nav className="fixed bottom-0 z-[60] flex w-full items-center justify-around rounded-t-xl border-t border-[var(--line)] bg-white p-2 px-3 shadow-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 px-2.5 py-2 text-[10px] font-medium transition",
              active ? "text-[var(--ink)]" : "text-[var(--muted-soft)]",
            )}
          >
            <Icon className={cn("size-4", active ? "text-[var(--ink)]" : "")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
