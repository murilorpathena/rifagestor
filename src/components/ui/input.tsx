import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3.5 text-[15px] text-[var(--ink)] shadow-sm transition placeholder:text-[#999999] hover:border-[#c7c7c7] focus:border-[var(--ink)] focus:outline-none disabled:bg-[#f7f7f7] disabled:text-[#999999]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-11 cursor-pointer appearance-none", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24 resize-y py-3", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-[var(--ink)] tracking-tight uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--muted-soft)]">{hint}</p>
      ) : null}
    </div>
  );
}
