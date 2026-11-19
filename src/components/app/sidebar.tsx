"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Logo } from "@/components/app/logo";
import { getNavItems } from "@/components/app/nav-config";
import { cn } from "@/lib/utils";

/** Navegação lateral fixa para telas grandes (lg+). */
export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { userRole, membership, profile } = useWorkspace();
  const items = getNavItems(userRole, membership?.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--line)] bg-white lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-[var(--line)] px-5">
        <Link href="/" className="focus-ring rounded-lg">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-[#f7f7f7] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:bg-[#f7f7f7] hover:text-[var(--ink)]",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active ? "text-[var(--ink)]" : "")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--line)] p-3">
        <Link
          href="/perfil"
          className={cn(
            "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[#f7f7f7]",
            pathname === "/perfil" ? "bg-[#f7f7f7] text-[var(--ink)]" : "text-[var(--muted)]",
          )}
        >
          <User className="size-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{profile?.name || "Meu perfil"}</span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--danger)] transition hover:bg-red-50"
        >
          <LogOut className="size-5 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
