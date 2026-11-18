import { LoaderCircle } from "lucide-react";

export function LoadingScreen({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm font-medium text-[var(--muted)]">
        <LoaderCircle className="size-7 animate-spin text-[var(--brand)]" />
        {message}
      </div>
    </div>
  );
}
