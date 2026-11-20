"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Membership, Organization, Profile, Raffle, UserRole } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { useRealtimeRefresh } from "@/hooks/use-realtime";

interface WorkspaceContextValue {
  organization: Organization | null;
  raffle: Raffle | null;
  membership: Membership | null;
  profile: Profile | null;
  userRole: UserRole | null;
  /** admin ou gestor (dono) da organização atual. */
  canManage: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Recarrega sem piscar o skeleton (usado pelo realtime). */
  refreshSilent: () => Promise<void>;
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

  const load = useCallback(async (showLoading: boolean) => {
    if (!user) {
      setOrganization(null);
      setRaffle(null);
      setMembership(null);
      setProfile(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
      setError(null);
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    const { data: prof, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !prof) {
      setError(profileError?.message ?? "Não foi possível carregar seu perfil. Procure o administrador.");
      setLoading(false);
      return;
    }

    const currentProfile = prof as Profile;
    setProfile(currentProfile);
    setUserRole(currentProfile.role as UserRole);

    const { data: member } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    setMembership((member as Membership | null) ?? null);

    // App de rifa única: o admin também enxerga a organização/rifa configurada.
    let orgId: string | null = member?.organization_id ?? null;
    if (!orgId) {
      const { data: firstOrg } = await supabase
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      orgId = firstOrg?.id ?? null;
    }

    if (!orgId) {
      setOrganization(null);
      setRaffle(null);
      setError("Nenhuma rifa configurada. Peça ao administrador para criar uma.");
      setLoading(false);
      return;
    }

    const [{ data: org, error: orgError }, { data: currentRaffle, error: raffleError }] =
      await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
        supabase
          .from("raffles")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (orgError || raffleError) {
      setError(orgError?.message ?? raffleError?.message ?? "Não foi possível carregar a rifa.");
    }

    setOrganization((org as Organization | null) ?? null);
    setRaffle((currentRaffle as Raffle | null) ?? null);
    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const refreshSilent = useCallback(async () => {
    await load(false);
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tempo real global: mudancas em rifa/perfil/vinculos refletem em todo o app.
  useRealtimeRefresh(
    ["raffles", "profiles", "organization_members"],
    () => refreshSilent(),
    Boolean(user),
  );

  const canManage =
    userRole === "admin" || membership?.role === "owner" || membership?.role === "gestor";

  const value = useMemo(
    () => ({
      organization,
      raffle,
      membership,
      profile,
      userRole,
      canManage,
      loading,
      error,
      refresh,
      refreshSilent,
    }),
    [organization, raffle, membership, profile, userRole, canManage, loading, error, refresh, refreshSilent],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace precisa estar dentro de WorkspaceProvider.");
  return context;
}
