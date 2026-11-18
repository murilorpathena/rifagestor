"use client";

import { useEffect, useState } from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  sale: {
    id: string;
    buyer_name: string;
    cpf: string;
    quantity: number;
    total_cents: number;
    numbers: number[];
    sold_at: string;
  };
}

export function ReceiptModal({ open, onClose, sale }: ReceiptModalProps) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => window.print(), 300);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative mx-auto w-full max-w-xs rounded-xl border border-[var(--line)] bg-white p-6 shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Comprovante de venda</h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-[var(--muted)] hover:bg-[#f7f7f7]"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="font-mono text-sm leading-6 border border-[var(--line)] rounded-lg p-4 bg-[#f7f7f7]" id="receita">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--line)] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[var(--ink)] font-bold">RifaGestor</span>
              <span className="text-[10px] text-[var(--muted)] uppercase">Gestão de rifas</span>
            </div>
            <Printer className="size-4 text-[var(--muted)]" />
          </div>

          <div className="mt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Comprador</span>
              <span className="font-medium">{sale.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">CPF</span>
              <span className="font-medium">{sale.cpf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Números</span>
              <span className="font-medium">{sale.numbers.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Quantidade</span>
              <span className="font-medium">{sale.quantity}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>{formatCurrency(sale.total_cents)}</span>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-center text-[var(--muted)]">
            {formatDateTime(sale.sold_at)} • Venda #{sale.id.slice(0, 8)}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            size="lg"
            className="flex-1"
            loading={printing}
            onClick={() => {
              setPrinting(true);
              window.setTimeout(() => {
                window.print();
                setPrinting(false);
              }, 100);
            }}
          >
            <Printer className="mr-2 size-4" /> Imprimir comprovante
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
