-- Permite o usuário atualizar seu próprio nome/email e o admin atualizar qualquer profile.
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.profiles to authenticated;
