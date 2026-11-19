import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-[var(--ink)] text-white">
        <Ticket className="size-4.5" strokeWidth={2} />
      </span>
      {!compact ? (
        <span className="text-lg font-extrabold tracking-[-0.03em]">
          Rifa<span className="text-[var(--ink)]">Gestor</span>
        </span>
      ) : null}
    </span>
  );
}
