"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Membership, Organization, Raffle } from "@/lib/types";
import { useAuth } from "./auth-provider";

interface WorkspaceContextValue {
  organization: Organization | null;
  raffle: Raffle | null;
  membership: Membership | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setRaffle(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      setError(memberError?.message ?? "Nenhuma rifa foi encontrada para esta conta.");
      setOrganization(null);
      setRaffle(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    const [{ data: org, error: orgError }, { data: currentRaffle, error: raffleError }] =
      await Promise.all([
        supabase.from("organizations").select("*").eq("id", member.organization_id).single(),
        supabase
          .from("raffles")
          .select("*")
          .eq("organization_id", member.organization_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (orgError || raffleError) {
      setError(orgError?.message ?? raffleError?.message ?? "Não foi possível carregar a rifa.");
    }

    setOrganization(org);
    setRaffle(currentRaffle);
    setMembership(member as Membership);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ organization, raffle, membership, loading, error, refresh }),
    [organization, raffle, membership, loading, error, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace precisa estar dentro de WorkspaceProvider.");
  return context;
}
