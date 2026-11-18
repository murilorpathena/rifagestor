import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatCard({ label, value, sub, icon: Icon, variant = "default" }: StatCardProps) {
  const color =
    variant === "success" ? "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]" :
    variant === "warning" ? "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]" :
    variant === "danger" ? "text-[var(--danger)] bg-[#fcf7f8] border border-red-100" :
    "text-[var(--ink)] bg-[#f7f7f7] border border-[var(--line)]";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4 card-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)] tracking-tighter uppercase">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {sub ? <p className="text-xs text-[var(--muted-soft)]">{sub}</p> : null}
        </div>
        <div className="grid size-8 place-items-center rounded-lg {color}">
          <Icon className="size-4.5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
