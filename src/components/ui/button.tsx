import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "solid",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "solid" &&
          "bg-[var(--ink)] text-white shadow-sm hover:bg-[var(--brand-hover)] active:scale-95",
        variant === "outline" &&
          "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[#f7f7f7] active:scale-95",
        variant === "ghost" &&
          "text-[var(--muted)] hover:bg-[#f7f7f7] hover:text-[var(--ink)] active:scale-95",
        variant === "danger" &&
          "bg-white text-[var(--danger)] border border-red-100 hover:bg-red-50 active:scale-95",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
