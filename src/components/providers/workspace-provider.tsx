"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Membership, Organization, Profile, Raffle, UserRole } from "@/lib/types";
import { useAuth } from "./auth-provider";

interface WorkspaceContextValue {
  organization: Organization | null;
  raffle: Raffle | null;
  membership: Membership | null;
  profile: Profile | null;
  userRole: UserRole | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setRaffle(null);
      setMembership(null);
      setProfile(null);
      setUserRole(null);
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

    // Carrega o profile para saber o role do usuário
    const { data: prof, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !prof) {
      setError(profileError?.message ?? "Não foi possível carregar seu perfil.");
      setLoading(false);
      return;
    }

    setProfile(prof as Profile);
    setUserRole((prof as Profile).role as UserRole);

    // Se for admin, não precisa de organização
    if ((prof as Profile).role === 'admin') {
      setOrganization(null);
      setRaffle(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    // Para gestor/vendedor, carrega organização
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      setError("Nenhuma organização encontrada para esta conta.");
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
    () => ({ organization, raffle, membership, profile, userRole, loading, error, refresh }),
    [organization, raffle, membership, profile, userRole, loading, error, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace precisa estar dentro de WorkspaceProvider.");
  return context;
}
