"use client";

import { useEffect, useState } from "react";
import { useClientSupabase } from "@/hooks/use-client-supabase";
import { Field, Select } from "@/components/ui/input";
import { Organization } from "@/lib/types";

export function OrganizationSelector({
  onChange,
}: {
  onChange: (org: Organization | null) => void;
}) {
  const supabase = useClientSupabase();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("organizations").select("*").order("name", { ascending: true });
      setOrgs(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  if (!supabase) return null;
  if (loading) return null;

  return (
    <Field label="Organização">
      <Select
        value=""
        onChange={(e) => {
          const id = e.target.value;
          const org = orgs.find((o) => o.id === id);
          onChange(org ?? null);
        }}
      >
        <option value="">Escolher organização</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
