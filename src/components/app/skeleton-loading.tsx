import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[var(--line)] bg-[#f7f7f7] p-4 animate-pulse", className)}>
      <div className="h-4 w-3/4 rounded bg-[#e5e5e5] mb-3" />
      <div className="h-4 w-1/2 rounded bg-[#e5e5e5] mb-2" />
      <div className="h-3 w-1/3 rounded bg-[#e5e5e5]" />
    </div>
  );
}

export function SkeletonNumberGrid({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 px-1 max-w-[460px] mx-auto">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="aspect-square rounded-lg border border-[var(--line)] bg-[#e5e5e5] animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonStat({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-24 rounded bg-[#e5e5e5] mb-2">{label}</div>
          <div className="h-6 w-16 rounded bg-[#e5e5e5]" />
        </div>
        <div className="grid size-8 place-items-center rounded-lg bg-[#f7f7f7]">
          <div className="h-4 w-4 rounded-full bg-[#e5e5e5] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
