import type { Metadata } from "next";
import { Providers } from "./providers";
import { AppShell } from "@/components/app/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RifaGestor — Gestão de rifas",
    template: "%s | RifaGestor",
  },
  description:
    "Sistema interno para organizar rifas, controlar números, registrar vendas e acompanhar sua equipe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
