"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Ticket, ShoppingCart, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const items: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/numeros", label: "Números", icon: Ticket },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

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
