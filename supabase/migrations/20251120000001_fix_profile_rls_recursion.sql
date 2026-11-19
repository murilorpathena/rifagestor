-- As policies antigas de profiles consultavam a própria tabela (EXISTS SELECT FROM profiles),
-- o que gera 42P17 "infinite recursion detected in policy definition" no PostgREST.
-- A função is_admin() é SECURITY DEFINER e não dispara RLS, então quebra o ciclo.

drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert" on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all" on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles manager read org" on public.profiles;
create policy "profiles manager read org" on public.profiles
  for select to authenticated
  using (public.is_org_manager_of_user(id));
