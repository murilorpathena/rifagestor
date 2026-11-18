import type { Metadata } from "next";
import { Providers } from "./providers";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
