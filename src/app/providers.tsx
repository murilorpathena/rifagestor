"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
