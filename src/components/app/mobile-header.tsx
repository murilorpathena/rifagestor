"use client";

import { LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Logo } from "@/components/app/logo";
import { getNavItems } from "@/components/app/nav-config";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
  showMenu?: boolean;
  userMenu?: boolean;
}

export function MobileHeader({ title, showMenu = true, userMenu = true }: MobileHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { userRole, membership, profile } = useWorkspace();
  const items = getNavItems(userRole, membership?.role);

  // Fecha os painéis ao trocar de rota.
  useEffect(() => {
    setNavOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Fecha com Escape.
  useEffect(() => {
    if (!navOpen && !userOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        setUserOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, userOpen]);

  // Fecha menu do usuário ao clicar fora
  useEffect(() => {
    if (!userOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [userOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--line)] bg-white/95 px-3 backdrop-blur-md lg:left-64">
        {showMenu ? (
          <button
            type="button"
            onClick={() => {
              setNavOpen((v) => !v);
              setUserOpen(false);
            }}
            className="focus-ring -ml-1 shrink-0 rounded-lg p-2 text-[var(--ink)] hover:bg-[#f7f7f7] lg:hidden"
            aria-label="Abrir menu de navegação"
            aria-expanded={navOpen}
          >
            <Menu className="size-5" />
          </button>
        ) : null}

        <Link
          href="/"
          className="focus-ring flex items-center gap-1.5 rounded-lg px-3 py-2 text-[var(--ink)] font-bold tracking-tight flex-1 text-center sm:text-base"
        >
          RIFA<span className="text-[var(--ink)]">GESTOR</span>
        </Link>

        <div className="flex shrink-0 items-center">
          {userMenu ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setNavOpen(false);
                }}
                className="focus-ring flex size-9 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[#f7f7f7]"
                aria-label="Menu do usuário"
                aria-expanded={userOpen}
              >
                <User className="size-5" />
              </button>
              {userOpen ? (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--line)] bg-white p-2 shadow-xl animate-fade-up">
                  <div className="mb-1 border-b border-[var(--line)] px-3 py-2">
                    <p className="truncate text-sm font-semibold">{profile?.name || "Usuário"}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{profile?.email || "—"}</p>
                  </div>
                  <Link
                    href="/perfil"
                    className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--ink)] hover:bg-[#f7f7f7]"
                  >
                    <User className="size-4" />
                    Meu perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--danger)] hover:bg-red-50"
                  >
                    <LogOut className="size-4" />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {/* Drawer de navegação (mobile/tablet) */}
      {navOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setNavOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col bg-white shadow-2xl animate-slide-in">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
              <Link href="/" onClick={() => setNavOpen(false)} className="focus-ring rounded-lg">
                <Logo />
              </Link>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="focus-ring rounded-lg p-2 text-[var(--muted)] hover:bg-[#f7f7f7]"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
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
              <button
                type="button"
                onClick={() => void signOut()}
                className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--danger)] hover:bg-red-50"
              >
                <LogOut className="size-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
