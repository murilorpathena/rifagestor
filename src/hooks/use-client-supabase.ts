"use client";

import { getSupabase } from "@/lib/supabase";

/**
 * Mantém um único cliente Supabase por aba.
 * Os providers, as páginas e as RPCs compartilham a mesma sessão.
 */
export function useClientSupabase() {
  return getSupabase();
}
