"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { getNavItems } from "@/components/app/nav-config";
import { cn } from "@/lib/utils";

/** Navegação inferior fixa para mobile/tablet (oculta em desktop). */
export function BottomNav() {
  const pathname = usePathname();
  const { userRole, membership } = useWorkspace();
  const items = getNavItems(userRole, membership?.role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] flex w-full items-center justify-around rounded-t-xl border-t border-[var(--line)] bg-white p-2 px-3 shadow-sm lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-medium transition",
              active ? "text-[var(--ink)]" : "text-[var(--muted-soft)]",
            )}
          >
            <Icon className={cn("size-5", active ? "text-[var(--ink)]" : "")} />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
