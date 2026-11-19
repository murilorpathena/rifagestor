"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { Raffle, RaffleNumber, Sale } from "@/lib/types";

interface NumberGridProps {
  raffle: Raffle | null;
  numbers: RaffleNumber[];
  selectedNumbers: Set<string>;
  onToggle: (id: string) => void;
  onSellSelected: (numbers: RaffleNumber[]) => void;
  loading?: boolean;
  /** Quando informado, a grade entra em modo gestão: clicar reserva/libera. */
  onManage?: (number: RaffleNumber) => void;
}

export function NumberGrid({
  raffle,
  numbers,
  selectedNumbers,
  onToggle,
  onSellSelected,
  loading,
  onManage,
}: NumberGridProps) {
  const sorted = useMemo(
    () => [...numbers].sort((a, b) => a.number - b.number),
    [numbers],
  );

  const selectedList = sorted.filter((n) => selectedNumbers.has(n.id));
  const canSell = selectedList.length > 0;
  const price = raffle?.ticket_price_cents ?? 0;

  const statusStyle = (status: string) => {
    switch (status) {
      case "sold":
        return "bg-[var(--ink)] text-white border-[var(--ink)]";
      case "reserved":
        return "bg-[#f7f7f7] text-[var(--muted)] border-[var(--line)]";
      default:
        return "bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[#f7f7f7]";
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold tracking-tight">
          {onManage ? "Grade da rifa" : "Números disponíveis"}
        </h2>
        {onManage ? (
          <span className="text-[10px] text-[var(--muted)]">Toque para reservar/liberar</span>
        ) : (
          <>
            <Button size="sm" onClick={() => onSellSelected(selectedList)} disabled={!canSell || loading} className="hidden sm:inline">
              Vender selecionados <ArrowRight className="ml-2 size-3.5" />
            </Button>
            {canSell ? (
              <Button variant="ghost" size="sm" onClick={() => onSellSelected(selectedList)} className="flex flex-col items-center gap-1 px-2">
                <Check className="size-4" />
                <span className="text-[10px] font-bold">{selectedList.length}</span>
              </Button>
            ) : null}
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-1 max-w-[460px] mx-auto">
        {sorted.map((number) => {
          const selected = selectedNumbers.has(number.id);
          const status = statusStyle(number.status);
          return (
            <button
              key={number.id}
              type="button"
              onClick={() => {
                if (onManage) {
                  if (number.status === "sold") return;
                  onManage(number);
                  return;
                }
                if (number.status !== "available") return;
                onToggle(number.id);
              }}
              disabled={number.status === "sold" || (!onManage && number.status !== "available")}
              aria-pressed={selected}
              className={cn(
                "aspect-square rounded-lg border flex items-center justify-center text-xs font-medium transition disabled:opacity-30",
                status,
                selected ? "ring-2 ring-[var(--ink)] ring-offset-1 bg-[var(--ink)] text-white" : "",
              )}
            >
              {number.number}
            </button>
          );
        })}
      </div>

      {!onManage && selectedList.length > 0 && (
        <div className="px-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[#f7f7f7]">
            <span className="text-sm font-semibold">{selectedList.length} número(s) selecionado(s)</span>
            <span className="text-sm font-bold text-[var(--ink)]">
              {formatCurrency(price * selectedList.length)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
