import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full border border-[var(--line)] bg-[#f7f7f7] text-[var(--muted)]">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-bold text-[var(--ink)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
