"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastItem["type"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-fade-up items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5 shadow-xl"
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
            )}
            <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => dismiss(toast.id)}
              className="rounded-lg p-1 text-[var(--muted)] hover:bg-[#eef2f1]"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast precisa estar dentro de ToastProvider.");
  return context;
}
