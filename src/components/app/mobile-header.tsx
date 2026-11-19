"use client";

import { Menu, MoreHorizontal, LogOut, Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";

interface MobileHeaderProps {
  title: string;
  showMenu?: boolean;
  userMenu?: boolean;
}

export function MobileHeader({ title, showMenu = true, userMenu = false }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <header className="fixed top-0 z-[50] flex w-full items-center justify-between gap-2 border-b border-[var(--line)] bg-white/90 backdrop-blur-md p-2.5 px-4 shadow-sm">
      <div className="flex items-center gap-2">
        {showMenu ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="focus-ring shrink-0 rounded-lg p-1.5 text-[var(--ink)] hover:bg-[#f7f7f7]"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
        ) : null}
        <Link href="/" className="flex items-center gap-2 focus-ring rounded-lg">
          <Logo compact />
          <span className="hidden sm:inline font-bold tracking-tight">Rifa<span className="text-[var(--ink)]">Gestor</span></span>
        </Link>
      </div>

      <h2 className="flex-1 text-center font-bold tracking-tight sm:hidden">{title}</h2>

      <div className="flex items-center gap-2">
        {userMenu ? (
          <div className="relative">
            <button type="button" className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[#f7f7f7]">
              <User className="size-5" />
            </button>
            {open ? (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--line)] bg-white p-2 shadow-xl animate-fade-up">
                <Link
                  href="/perfil"
                  className="focus-ring block rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
                >
                  Meu perfil
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="focus-ring w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--danger)] hover:bg-red-50"
                >
                  Sair <LogOut className="ml-2 size-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
