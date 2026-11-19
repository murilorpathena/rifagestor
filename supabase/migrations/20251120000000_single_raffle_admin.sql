-- Modelo de rifa única: admin gerencia tudo; gestores/vendedores não criam organizações sozinhos.
-- Corrige o trigger silencioso e completa as policies de escrita que faltavam.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.organization_members
    where organization_id = p_org
      and user_id = auth.uid()
      and role in ('owner', 'gestor')
  );
$$;

create or replace function public.is_org_manager_of_raffle(p_raffle uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.raffles
    where id = p_raffle and public.is_org_manager(organization_id)
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_org_manager_of_raffle(uuid) to authenticated;

-- Trigger: sempre cria/atualiza o profile. Nunca cria organização nem rifa automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(v_meta->>'role', 'vendedor');
  v_token uuid;
  v_inv record;
begin
  if v_role not in ('admin', 'gestor', 'vendedor') then
    v_role := 'vendedor';
  end if;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(v_meta->>'full_name', ''), new.email),
    new.email,
    v_role
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        role = excluded.role;

  -- Aceite automático quando o usuário veio de um convite.
  if v_meta ? 'invitation_token' then
    begin
      v_token := (v_meta->>'invitation_token')::uuid;
      select * into v_inv
        from public.invitations
       where token = v_token and status = 'pending';

      if found
         and v_inv.expires_at > now()
         and lower(v_inv.email) = lower(new.email) then

        insert into public.organization_members (organization_id, user_id, role)
        values (
          v_inv.organization_id,
          new.id,
          case when v_inv.role = 'owner' then 'owner' else 'member' end
        )
        on conflict do nothing;

        update public.invitations
           set status = 'accepted', accepted_by = new.id, accepted_at = now()
         where token = v_token;
      end if;
    exception when others then
      null;
    end;
  end if;

  return new;
end;
$$;

-- Garante que a grade de números acompanhe a configuração da rifa.
create or replace function public.ensure_raffle_numbers(p_raffle_id uuid, p_total integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_manager_of_raffle(p_raffle_id) then
    raise exception 'Sem permissão para alterar esta rifa';
  end if;

  if p_total is null or p_total < 1 or p_total > 100000 then
    raise exception 'Total de números inválido';
  end if;

  insert into public.raffle_numbers (raffle_id, number, status)
  select p_raffle_id, g, 'available'
    from generate_series(1, p_total) as g
  on conflict (raffle_id, number) do nothing;

  -- Só remove números que ainda não foram vendidos/reservados.
  delete from public.raffle_numbers
   where raffle_id = p_raffle_id
     and number > p_total
     and status = 'available';

  update public.raffles
     set total_numbers = p_total, updated_at = now()
   where id = p_raffle_id;

  return p_total;
end;
$$;

grant execute on function public.ensure_raffle_numbers(uuid, integer) to authenticated;

-- Reserva/libera manual de números (não altera números já vendidos).
create or replace function public.set_number_status(p_number_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_current text;
begin
  if p_status not in ('available', 'reserved') then
    raise exception 'Status inválido';
  end if;

  select r.organization_id, n.status
    into v_org, v_current
    from public.raffle_numbers n
    join public.raffles r on r.id = n.raffle_id
   where n.id = p_number_id;

  if not found then
    raise exception 'Número não encontrado';
  end if;

  if not public.is_org_manager(v_org) then
    raise exception 'Sem permissão para alterar este número';
  end if;

  if v_current = 'sold' then
    raise exception 'Número vendido não pode ser alterado por aqui';
  end if;

  update public.raffle_numbers
     set status = p_status,
         sale_id = case when p_status = 'available' then null else sale_id end,
         buyer_id = case when p_status = 'available' then null else buyer_id end,
         updated_at = now()
   where id = p_number_id;
end;
$$;

grant execute on function public.set_number_status(uuid, text) to authenticated;

-- Policies de escrita que estavam faltando -------------------------------------------------------

drop policy if exists "orgs admin all" on public.organizations;
create policy "orgs admin all" on public.organizations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "raffles admin all" on public.raffles;
create policy "raffles admin all" on public.raffles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "raffles manager update" on public.raffles;
create policy "raffles manager update" on public.raffles
  for update to authenticated
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists "raffles manager insert" on public.raffles;
create policy "raffles manager insert" on public.raffles
  for insert to authenticated
  with check (public.is_org_manager(organization_id));

drop policy if exists "raffle_numbers admin all" on public.raffle_numbers;
create policy "raffle_numbers admin all" on public.raffle_numbers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "raffle_numbers manager update" on public.raffle_numbers;
create policy "raffle_numbers manager update" on public.raffle_numbers
  for update to authenticated
  using (public.is_org_manager_of_raffle(raffle_id))
  with check (public.is_org_manager_of_raffle(raffle_id));

drop policy if exists "raffle_numbers manager insert" on public.raffle_numbers;
create policy "raffle_numbers manager insert" on public.raffle_numbers
  for insert to authenticated
  with check (public.is_org_manager_of_raffle(raffle_id));

drop policy if exists "members manager insert" on public.organization_members;
create policy "members manager insert" on public.organization_members
  for insert to authenticated
  with check (public.is_org_manager(organization_id));

drop policy if exists "members manager update" on public.organization_members;
create policy "members manager update" on public.organization_members
  for update to authenticated
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists "members manager delete" on public.organization_members;
create policy "members manager delete" on public.organization_members
  for delete to authenticated
  using (public.is_org_manager(organization_id));

drop policy if exists "invitations admin all" on public.invitations;
create policy "invitations admin all" on public.invitations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invitations manager insert" on public.invitations;
create policy "invitations manager insert" on public.invitations
  for insert to authenticated
  with check (public.is_org_manager(organization_id));

drop policy if exists "invitations manager update" on public.invitations;
create policy "invitations manager update" on public.invitations
  for update to authenticated
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists "invitations manager delete" on public.invitations;
create policy "invitations manager delete" on public.invitations
  for delete to authenticated
  using (public.is_org_manager(organization_id));

drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles
  for delete to authenticated
  using (public.is_admin() and id <> auth.uid());
