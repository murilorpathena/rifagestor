-- Adicionar coluna role ao profiles
alter table profiles add column if not exists role text not null default 'vendedor' check (role in ('admin', 'gestor', 'vendedor'));
create index if not exists idx_profiles_role on profiles(role);

-- Atualizar trigger handle_new_user para não criar org/rifa se for admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_user uuid := new.id;
  v_meta jsonb := new.raw_user_meta_data;
  v_org uuid;
  v_raffle uuid;
  v_slug text;
  v_price integer := 2000;
  v_total integer := 100;
  v_default_qty integer := 1;
  i integer;
begin
  -- Cria o perfil (sempre)
  begin
    insert into profiles (id, name, email, role)
    values (v_user, coalesce((v_meta->>'full_name')::text, new.email), new.email,
            coalesce((v_meta->>'role')::text, 'vendedor'));
  exception when others then end;

  -- Se for admin, não cria organização nem rifa
  if coalesce((v_meta->>'role')::text, 'vendedor') = 'admin' then
    return new;
  end if;

  -- Se veio de convite, aceita automaticamente
  if v_meta ? 'invitation_token' then
    begin
      declare
        v_invitation record;
      begin
        select * into v_invitation from invitations where token = (v_meta->>'invitation_token')::uuid and status = 'pending';
        if found and v_invitation.expires_at > now() and lower(v_invitation.email) = lower(new.email) then
          insert into organization_members (organization_id, user_id, role)
          values (v_invitation.organization_id, v_user, v_invitation.role)
          on conflict do nothing;

          update invitations
          set status = 'accepted', accepted_by = v_user, accepted_at = now()
          where token = v_invitation.token;
        end if;
      end;
    end;
    return new;
  end if;

  -- Caso contrário, cria organização e rifa próprias
  begin
    v_slug := lower(regexp_replace(coalesce(v_meta->>'organization_name', 'minha-rifa'), '[^a-z0-9]+', '-', 'g'));

    insert into organizations (name, slug)
    values (coalesce(v_meta->>'organization_name', 'Minha Rifa'), v_slug)
    returning id into v_org;

    insert into organization_members (organization_id, user_id, role)
    values (v_org, v_user, 'owner');

    v_price := coalesce((v_meta->>'ticket_price_cents')::integer, 2000);
    v_total := coalesce((v_meta->>'total_numbers')::integer, 100);
    v_default_qty := coalesce((v_meta->>'default_numbers_per_sale')::integer, 1);

    insert into raffles (organization_id, title, description, prize, ticket_price_cents,
                         total_numbers, default_numbers_per_sale, created_by)
    values (v_org, coalesce(v_meta->>'raffle_title', 'Minha Rifa'),
            'Rifa criada automaticamente no cadastro.', null, v_price, v_total, v_default_qty, v_user)
    returning id into v_raffle;

    for i in 1..v_total loop
      insert into raffle_numbers (raffle_id, number, status)
      values (v_raffle, i, 'available');
    end loop;
  exception when others then
    -- Se algo falhar, pelo menos o usuário e perfil já foram criados acima
  end;

  return new;
end;
$$;

-- Atualizar RLS: profiles - admin lê tudo, outros só próprio
drop policy if exists "profiles own read" on profiles;
drop policy if exists "profiles own insert" on profiles;
drop policy if exists "profiles own update" on profiles;

create policy "profiles admin read all" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "profiles self read" on profiles for select using (auth.uid() = id);
create policy "profiles self insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on profiles for update using (auth.uid() = id);
create policy "profiles admin insert" on profiles for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "profiles admin update" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- RLS organization_members: admin lê tudo, membro da org lê sua org
drop policy if exists "members read own org" on organization_members;
create policy "members admin read all" on organization_members for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "members read own org" on organization_members for select using (
  exists (select 1 from organization_members m2 where m2.organization_id = organization_members.organization_id and m2.user_id = auth.uid())
);
create policy "members admin insert" on organization_members for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "members admin update" on organization_members for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "members admin delete" on organization_members for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- RLS raffles: admin lê tudo, membro da org lê sua org
drop policy if exists "raffles read org members" on raffles;
create policy "raffles admin read all" on raffles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "raffles read org members" on raffles for select using (
  exists (select 1 from organization_members where organization_id = raffles.organization_id and user_id = auth.uid())
);

-- RLS raffle_numbers: admin lê tudo, membro da org lê sua org
drop policy if exists "raffle_numbers read org members" on raffle_numbers;
create policy "raffle_numbers admin read all" on raffle_numbers for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "raffle_numbers read org members" on raffle_numbers for select using (
  exists (select 1 from organization_members m
   join raffles r on r.id = raffle_numbers.raffle_id
   where m.organization_id = r.organization_id and m.user_id = auth.uid())
);

-- RLS buyers: admin lê tudo, membro da org lê sua org
drop policy if exists "buyers read org members" on buyers;
drop policy if exists "buyers insert org members" on buyers;
drop policy if exists "buyers update org members" on buyers;
create policy "buyers admin all" on buyers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "buyers read org members" on buyers for select using (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);
create policy "buyers insert org members" on buyers for insert with check (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);
create policy "buyers update org members" on buyers for update using (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);

-- RLS sales: admin lê tudo, gestor/membro da org lê vendas da org, vendedor vê só as suas
drop policy if exists "sales read org members" on sales;
create policy "sales admin all" on sales for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "sales read org members" on sales for select using (
  exists (select 1 from organization_members where organization_id = sales.organization_id and user_id = auth.uid())
);
create policy "sales insert org members" on sales for insert with check (
  exists (select 1 from organization_members where organization_id = sales.organization_id and user_id = auth.uid())
);
create policy "sales update own or org" on sales for update using (
  -- Admin ou membro da org pode atualizar qualquer venda da org
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or
  exists (select 1 from organization_members where organization_id = sales.organization_id and user_id = auth.uid())
);

-- RLS sale_numbers: admin lê tudo, membro da org lê da org
drop policy if exists "sale_numbers read org members" on sale_numbers;
create policy "sale_numbers admin all" on sale_numbers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "sale_numbers read org members" on sale_numbers for select using (
  exists (
    select 1 from sales s
    join organization_members m on m.organization_id = s.organization_id
    where s.id = sale_numbers.sale_id and m.user_id = auth.uid()
  )
);

-- RLS invitations: admin lê/cria tudo, membro da org lê sua org
drop policy if exists "invitations read org members" on invitations;
create policy "invitations admin all" on invitations for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "invitations read org members" on invitations for select using (
  exists (select 1 from organization_members where organization_id = invitations.organization_id and user_id = auth.uid())
);

-- Comentários
comment on column profiles.role is 'Tipo de usuário: admin (sistema), gestor (organização), vendedor (operacional)';
comment on table invitations is 'Convites de vendedores/gestores para organizações';
