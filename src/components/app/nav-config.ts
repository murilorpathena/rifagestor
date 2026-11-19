import { BarChart2, Ticket, ShoppingCart, Users, Settings, ShieldUser, CreditCard } from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const adminItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/configuracoes", label: "Rifa", icon: Settings },
  { href: "/admin/usuarios", label: "Usuários", icon: ShieldUser },
  { href: "/numeros", label: "Números", icon: Ticket },
  { href: "/vendas/historico", label: "Vendas", icon: ShoppingCart },
];

const gestorItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/numeros", label: "Números", icon: Ticket },
  { href: "/vendas", label: "Vender", icon: ShoppingCart },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/configuracoes", label: "Rifa", icon: Settings },
];

const vendedorItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: BarChart2 },
  { href: "/vendas", label: "Vender", icon: ShoppingCart },
  { href: "/vendas/historico", label: "Minhas vendas", icon: CreditCard },
  { href: "/numeros", label: "Números", icon: Ticket },
];

/** Retorna os itens de navegação conforme o papel do usuário. */
export function getNavItems(role: UserRole | null, membershipRole: string | null | undefined): NavItem[] {
  if (role === "admin") return adminItems;
  if (role === "gestor" || membershipRole === "owner") return gestorItems;
  return vendedorItems;
}
