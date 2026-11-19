-- Elimina todas as policies auto-referentes que causam 42P17 no PostgREST.
-- Helpers SECURITY DEFINER leem as tabelas sem disparar RLS recursivo.

create or replace function public.is_org_member(p_org uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = p_user
  );
$$;

create or replace function public.is_org_member_of_raffle(p_raffle uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.raffles
    where id = p_raffle and public.is_org_member(organization_id, auth.uid())
  );
$$;

grant execute on function public.is_org_member(uuid, uuid) to authenticated;
grant execute on function public.is_org_member_of_raffle(uuid) to authenticated;

-- organization_members -------------------------------------------------------
drop policy if exists "members admin read all" on public.organization_members;
create policy "members admin read all" on public.organization_members
  for select to authenticated using (public.is_admin());

drop policy if exists "members admin insert" on public.organization_members;
create policy "members admin insert" on public.organization_members
  for insert to authenticated with check (public.is_admin());

drop policy if exists "members admin update" on public.organization_members;
create policy "members admin update" on public.organization_members
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members admin delete" on public.organization_members;
create policy "members admin delete" on public.organization_members
  for delete to authenticated using (public.is_admin());

drop policy if exists "members read own org" on public.organization_members;
create policy "members read own org" on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id, auth.uid()));

-- organizations --------------------------------------------------------------
drop policy if exists "orgs read members" on public.organizations;
create policy "orgs read members" on public.organizations
  for select to authenticated
  using (public.is_org_member(id, auth.uid()));

-- raffles --------------------------------------------------------------------
drop policy if exists "raffles admin read all" on public.raffles;
create policy "raffles admin read all" on public.raffles
  for select to authenticated using (public.is_admin());

drop policy if exists "raffles read org members" on public.raffles;
create policy "raffles read org members" on public.raffles
  for select to authenticated
  using (public.is_org_member(organization_id, auth.uid()));

-- raffle_numbers -------------------------------------------------------------
drop policy if exists "raffle_numbers admin read all" on public.raffle_numbers;
create policy "raffle_numbers admin read all" on public.raffle_numbers
  for select to authenticated using (public.is_admin());

drop policy if exists "raffle_numbers read org members" on public.raffle_numbers;
create policy "raffle_numbers read org members" on public.raffle_numbers
  for select to authenticated
  using (public.is_org_member_of_raffle(raffle_id));

-- buyers ---------------------------------------------------------------------
drop policy if exists "buyers admin all" on public.buyers;
create policy "buyers admin all" on public.buyers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "buyers insert org members" on public.buyers;
create policy "buyers insert org members" on public.buyers
  for insert to authenticated
  with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "buyers update org members" on public.buyers;
create policy "buyers update org members" on public.buyers
  for update to authenticated
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

-- sales ----------------------------------------------------------------------
drop policy if exists "sales admin all" on public.sales;
create policy "sales admin all" on public.sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sales insert org members" on public.sales;
create policy "sales insert org members" on public.sales
  for insert to authenticated
  with check (public.is_org_member(organization_id, auth.uid()));

-- sale_numbers ---------------------------------------------------------------
drop policy if exists "sale_numbers admin all" on public.sale_numbers;
create policy "sale_numbers admin all" on public.sale_numbers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
