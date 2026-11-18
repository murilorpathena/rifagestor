-- Banco de dados Supabase para o RifaGestor.
-- Executar este SQL no SQL Editor do Supabase (apenas uma vez por projeto).
-- Não cria usuários: auth.users é gerido pelo Supabase Auth.

-- =====================================================================
-- Habilitar extensões úteis
-- =====================================================================
create extension if not exists pgcrypto;

-- =====================================================================
-- Tabelas
-- =====================================================================

create table profiles (
  id uuid references auth.users not null primary key,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table raffles (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  title text not null,
  description text,
  prize text,
  draw_date timestamptz,
  ticket_price_cents integer not null default 2000 check (ticket_price_cents >= 100),
  total_numbers integer not null default 100 check (total_numbers > 0),
  default_numbers_per_sale integer not null default 1 check (default_numbers_per_sale > 0),
  status text not null default 'active' check (status in ('active', 'closed', 'draft')),
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table buyers (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  cpf text not null,
  email text,
  whatsapp text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, cpf)
);

create table sales (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  raffle_id uuid references raffles(id) on delete cascade not null,
  buyer_id uuid references buyers(id) on delete restrict not null,
  seller_id uuid references auth.users(id) on delete restrict not null,
  quantity integer not null check (quantity > 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null default 'pix' check (payment_method in ('pix', 'cash', 'card', 'other')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'cancelled')),
  notes text,
  sold_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table raffle_numbers (
  id uuid default gen_random_uuid() primary key,
  raffle_id uuid references raffles(id) on delete cascade not null,
  number integer not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  sale_id uuid references sales(id) on delete set null,
  buyer_id uuid references buyers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raffle_id, number)
);

create table sale_numbers (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references sales(id) on delete cascade not null,
  raffle_number_id uuid references raffle_numbers(id) on delete cascade not null,
  number_value integer not null,
  created_at timestamptz not null default now(),
  unique (sale_id, raffle_number_id)
);

create table invitations (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- =====================================================================
-- Índices úteis
-- =====================================================================
create index idx_organization_members_user on organization_members(user_id);
create index idx_raffles_org on raffles(organization_id);
create index idx_raffle_numbers_raffle_status on raffle_numbers(raffle_id, status, number);
create index idx_raffle_numbers_buyer on raffle_numbers(buyer_id);
create index idx_buyers_org_cpf on buyers(organization_id, cpf);
create index idx_sales_org_date on sales(organization_id, sold_at desc);
create index idx_sales_raffle_status on sales(raffle_id, payment_status);
create index idx_sales_seller on sales(seller_id);
create index idx_sales_buyer on sales(buyer_id);
create index idx_invitations_org_status on invitations(organization_id, status);
create index idx_invitations_email on invitations(email);

-- =====================================================================
-- Trigger updated_at genérico
-- =====================================================================
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations for each row execute function set_updated_at();
create trigger trg_raffles_updated_at before update on raffles for each row execute function set_updated_at();
create trigger trg_raffle_numbers_updated_at before update on raffle_numbers for each row execute function set_updated_at();
create trigger trg_buyers_updated_at before update on buyers for each row execute function set_updated_at();
create trigger trg_sales_updated_at before update on sales for each row execute function set_updated_at();

-- =====================================================================
-- Funções auxiliares de segurança (security definer, sem recursão de RLS)
-- =====================================================================
create function is_org_member(p_org uuid, p_user uuid) returns boolean language plpgsql as $$
begin
  return exists (
    select 1 from organization_members
    where organization_id = p_org and user_id = p_user
  );
end;
$$;

create function has_org_role(p_org uuid, p_user uuid, p_role text) returns boolean language plpgsql as $$
begin
  return exists (
    select 1 from organization_members
    where organization_id = p_org and user_id = p_user and role = p_role
  );
end;
$$;

-- =====================================================================
-- RLS: habilitar em todas as tabelas
-- =====================================================================
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table raffles enable row level security;
alter table raffle_numbers enable row level security;
alter table buyers enable row level security;
alter table sales enable row level security;
alter table sale_numbers enable row level security;
alter table invitations enable row level security;

-- =====================================================================
-- Políticas
-- =====================================================================

-- profiles: só o próprio usuário (e leitura pública mínima dentro da org)
create policy "profiles own read" on profiles for select using (auth.uid() = id);
create policy "profiles own insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles own update" on profiles for update using (auth.uid() = id);

-- organizations: leitura só para membros da organização
create policy "orgs read members" on organizations for select using (
  exists (select 1 from organization_members where organization_id = id and user_id = auth.uid())
);

-- organization_members: leitura/gestão só membros da organização
create policy "members read own org" on organization_members for select using (
  exists (select 1 from organization_members m2 where m2.organization_id = organization_members.organization_id and m2.user_id = auth.uid())
);

-- raffles: leitura para membros da organização
create policy "raffles read org members" on raffles for select using (
  exists (select 1 from organization_members where organization_id = raffles.organization_id and user_id = auth.uid())
);

-- raffle_numbers: leitura para membros da organização
create policy "raffle_numbers read org members" on raffle_numbers for select using (
  exists (select 1 from organization_members where organization_id = (select organization_id from raffles where id = raffle_id) and user_id = auth.uid())
);

-- buyers: leitura/escrita para membros da organização (CPF único por org)
create policy "buyers read org members" on buyers for select using (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);
create policy "buyers insert org members" on buyers for insert with check (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);
create policy "buyers update org members" on buyers for update using (
  exists (select 1 from organization_members where organization_id = buyers.organization_id and user_id = auth.uid())
);

-- sales: leitura para membros da organização
create policy "sales read org members" on sales for select using (
  exists (select 1 from organization_members where organization_id = sales.organization_id and user_id = auth.uid())
);

-- sale_numbers: leitura para membros da organização
create policy "sale_numbers read org members" on sale_numbers for select using (
  exists (
    select 1 from sales s
    join organization_members m on m.organization_id = s.organization_id
    where s.id = sale_numbers.sale_id and m.user_id = auth.uid()
  )
);

-- invitations: leitura só membros da organização; criação só owner (via RPC)
create policy "invitations read org members" on invitations for select using (
  exists (select 1 from organization_members where organization_id = invitations.organization_id and user_id = auth.uid())
);

-- =====================================================================
-- RPCs (Security Definer) — são a porta de entrada para escrita operacional
-- =====================================================================

-- 1. Criar venda atômica com seleção de números
create or replace function create_sale(
  p_raffle_id uuid,
  p_buyer_name text,
  p_buyer_cpf text,
  p_buyer_email text,
  p_buyer_whatsapp text,
  p_quantity integer,
  p_number_ids uuid[] default '{}',
  p_payment_method text default 'pix',
  p_payment_status text default 'paid',
  p_notes text default null
) returns uuid language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_member record;
  v_raffle record;
  v_buyer uuid;
  v_price integer;
  v_total integer;
  v_new_numbers uuid[];
  v_num uuid[];
  v_sale uuid;
  v_count integer := 0;
  v_locked uuid;
  v_exists boolean;
begin
  -- Verifica se o usuário é membro da organização da rifa
  select * into v_raffle from raffles where id = p_raffle_id;
  if not found then
    raise exception 'Rifa não encontrada.';
  end if;

  select * into v_member from organization_members
  where organization_id = v_raffle.organization_id and user_id = v_user;
  if not found then
    raise exception 'Usuário não é membro desta organização.';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  select price_cents into v_price from raffles where id = p_raffle_id;
  v_total := v_price * p_quantity;

  -- Bloqueia a rifa para evitar corridas (row-level advisory)
  select id into v_locked from raffles where id = p_raffle_id for update;

  -- Se não passou números específicos, escolhe automaticamente os primeiros disponíveis
  if array_length(p_number_ids, 1) is null then
    p_number_ids := '{}';
  end if;

  -- Valida os números informados: devem pertencer à rifa e estarem disponíveis
  if array_length(p_number_ids, 1) > 0 then
    select count(*) into v_count
    from raffle_numbers
    where id = any(p_number_ids) and raffle_id = p_raffle_id and status = 'available';

    if v_count <> array_length(p_number_ids, 1) then
      raise exception 'Um ou mais números informados não estão disponíveis.';
    end if;

    if array_length(p_number_ids, 1) <> p_quantity then
      raise exception 'A quantidade de números selecionados não confere com a quantidade informada.';
    end if;
  else
    -- Seleciona automaticamente números disponíveis em ordem crescente
    select array_agg(id order by number) into v_num
    from raffle_numbers
    where raffle_id = p_raffle_id and status = 'available'
    order by number
    limit p_quantity
    for update of raffle_numbers;

    if array_length(v_num, 1) is null or array_length(v_num, 1) < p_quantity then
      raise exception 'Não há números suficientes disponíveis.';
    end if;

    p_number_ids := v_num;
  end if;

  -- Upsert do comprador por organização + CPF (apenas dígitos)
  select id into v_buyer from buyers
  where organization_id = v_raffle.organization_id and cpf = regexp_replace(p_buyer_cpf, '\D', '', 'g');

  if not found then
    insert into buyers (organization_id, name, cpf, email, whatsapp)
    values (v_raffle.organization_id, p_buyer_name, regexp_replace(p_buyer_cpf, '\D', '', 'g'),
            nullif(p_buyer_email, ''), p_buyer_whatsapp)
    returning id into v_buyer;
  else
    update buyers set name = p_buyer_name,
                      email = nullif(p_buyer_email, ''),
                      whatsapp = p_buyer_whatsapp,
                      updated_at = now()
    where id = v_buyer;
  end if;

  -- Cria a venda
  insert into sales (organization_id, raffle_id, buyer_id, seller_id, quantity, total_cents,
                     payment_method, payment_status, notes, sold_at, paid_at)
  values (v_raffle.organization_id, p_raffle_id, v_buyer, v_user, p_quantity, v_total,
          p_payment_method, p_payment_status, p_notes,
          now(), case when p_payment_status = 'paid' then now() else null end)
  returning id into v_sale;

  -- Vincula números à venda e marca como vendidos
  for i in 1..array_length(p_number_ids, 1) loop
    insert into sale_numbers (sale_id, raffle_number_id, number_value)
    select v_sale, id, number from raffle_numbers where id = p_number_ids[i];

    update raffle_numbers
    set status = case when p_payment_status = 'paid' then 'sold' else 'reserved' end,
        sale_id = v_sale,
        buyer_id = v_buyer,
        updated_at = now()
    where id = p_number_ids[i];
  end loop;

  return v_sale;
end;
$$;

-- 2. Alterar status de uma venda (pagar/cancelar)
create or replace function set_sale_status(p_sale_id uuid, p_status text) returns uuid language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_sale record;
  v_member record;
begin
  select * into v_sale from sales where id = p_sale_id;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  select * into v_member from organization_members
  where organization_id = v_sale.organization_id and user_id = v_user;
  if not found then
    raise exception 'Usuário não é membro desta organização.';
  end if;

  update sales
  set payment_status = p_status,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      updated_at = now()
  where id = p_sale_id;

  -- Sincroniza status dos números vinculados
  if p_status = 'cancelled' then
    update raffle_numbers
    set status = 'available', sale_id = null, buyer_id = null, updated_at = now()
    where sale_id = p_sale_id;
  elsif p_status = 'paid' then
    update raffle_numbers
    set status = 'sold', updated_at = now()
    where sale_id = p_sale_id;
  elsif p_status = 'pending' then
    update raffle_numbers
    set status = 'reserved', updated_at = now()
    where sale_id = p_sale_id;
  end if;

  return p_sale_id;
end;
$$;

-- 3. Atualizar configurações da rifa e sincronizar números
create or replace function update_raffle_settings(
  p_raffle_id uuid,
  p_title text,
  p_description text,
  p_prize text,
  p_draw_date timestamptz,
  p_ticket_price_cents integer,
  p_total_numbers integer,
  p_default_numbers_per_sale integer
) returns uuid language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_member record;
  v_raffle record;
  v_max integer;
  v_new_numbers integer[];
  i integer;
begin
  select * into v_raffle from raffles where id = p_raffle_id;
  if not found then
    raise exception 'Rifa não encontrada.';
  end if;

  select * into v_member from organization_members
  where organization_id = v_raffle.organization_id and user_id = v_user;
  if not found then
    raise exception 'Usuário não é membro desta organização.';
  end if;

  if p_total_numbers <= 0 then
    raise exception 'Total de números deve ser maior que zero.';
  end if;

  update raffles
  set title = p_title,
      description = p_description,
      prize = p_prize,
      draw_date = p_draw_date,
      ticket_price_cents = p_ticket_price_cents,
      total_numbers = p_total_numbers,
      default_numbers_per_sale = p_default_numbers_per_sale,
      updated_at = now()
  where id = p_raffle_id;

  -- Ajusta a quantidade de números: cria novos ou reduz apenas os não vendidos/reservados
  select max(number) into v_max from raffle_numbers where raffle_id = p_raffle_id;

  if p_total_numbers > coalesce(v_max, 0) then
    v_new_numbers := array[]::integer[];
    for i in (coalesce(v_max, 0) + 1)..p_total_numbers loop
      v_new_numbers := v_new_numbers || i;
    end loop;

    for i in 1..array_length(v_new_numbers, 1) loop
      insert into raffle_numbers (raffle_id, number, status)
      values (p_raffle_id, v_new_numbers[i], 'available');
    end loop;
  elsif p_total_numbers < coalesce(v_max, 0) then
    delete from raffle_numbers
    where raffle_id = p_raffle_id
      and number > p_total_numbers
      and status in ('available');
  end if;

  return p_raffle_id;
end;
$$;

-- 4. Criar convite (apenas owner)
create or replace function create_invitation(p_email text, p_role text default 'member') returns jsonb language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_member record;
  v_org uuid;
  v_inviter record;
  v_expires timestamptz := now() + interval '7 days';
  v_token uuid;
begin
  select * into v_member from organization_members where user_id = v_user limit 1;
  if not found then
    raise exception 'Usuário não pertence a nenhuma organização.';
  end if;

  if v_member.role <> 'owner' then
    raise exception 'Apenas o proprietário pode convidar.';
  end if;

  v_org := v_member.organization_id;

  select name into v_inviter from profiles where id = v_user;

  insert into invitations (organization_id, email, role, expires_at, invited_by)
  values (v_org, lower(trim(p_email)), p_role, v_expires, v_user)
  returning token into v_token;

  return jsonb_build_object(
    'id', v_token,
    'token', v_token,
    'email', lower(trim(p_email)),
    'role', p_role,
    'expires_at', v_expires,
    'invite_url', format('%s/convite/%s', current_setting('app.url', true), v_token)
  );
end;
$$;

-- 5. Aceitar convite (usuário já logado)
create or replace function accept_invitation(p_token uuid) returns uuid language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_invitation record;
  v_profile record;
begin
  select * into v_invitation from invitations where token = p_token and status = 'pending';
  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  if v_invitation.expires_at < now() then
    update invitations set status = 'expired' where token = p_token;
    raise exception 'Convite expirado.';
  end if;

  -- O email do convite deve bater com o perfil do usuário logado
  select * into v_profile from profiles where id = v_user;
  if not found or lower(v_profile.email) <> lower(v_invitation.email) then
    raise exception 'O convite é para outro e-mail. Faça login com o e-mail convidado.';
  end if;

  insert into organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user, v_invitation.role)
  on conflict do nothing;

  update invitations
  set status = 'accepted', accepted_by = v_user, accepted_at = now()
  where token = p_token;

  return v_invitation.organization_id;
end;
$$;

-- 6. Preview do convite (anon pode ler apenas dados mínimos)
create or replace function get_invitation_preview(p_token uuid) returns jsonb language plpgsql security definer as $$
declare
  v_invitation record;
  v_org record;
  v_inviter record;
begin
  select * into v_invitation from invitations where token = p_token;
  if not found then
    raise exception 'Convite não encontrado.';
  end if;

  select name into v_org from organizations where id = v_invitation.organization_id;
  select name into v_inviter from profiles where id = v_invitation.invited_by;

  return jsonb_build_object(
    'organization_name', v_org,
    'email', v_invitation.email,
    'inviter_name', v_inviter,
    'role', v_invitation.role,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

-- =====================================================================
-- Trigger de criação automática após cadastro (via Supabase Auth)
-- =====================================================================
-- Esta função roda como security definer do próprio auth (supabase functions)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_user uuid := new.id;
  v_meta jsonb := new.raw_user_meta_data;
  v_org uuid;
  v_raffle uuid;
  v_slug text;
  v_price integer := coalesce((v_meta->>'ticket_price_cents')::integer, 2000);
  v_total integer := coalesce((v_meta->>'total_numbers')::integer, 100);
  v_default_qty integer := coalesce((v_meta->>'default_numbers_per_sale')::integer, 1);
  i integer;
  v_invitation record;
begin
  -- Cria o perfil
  insert into profiles (id, name, email)
  values (v_user, coalesce(v_meta->>'full_name', new.email), new.email);

  -- Se veio de convite, aceita automaticamente
  if v_meta ? 'invitation_token' then
    select * into v_invitation from invitations where token = (v_meta->>'invitation_token')::uuid and status = 'pending';
    if found and v_invitation.expires_at > now() and lower(v_invitation.email) = lower(new.email) then
      insert into organization_members (organization_id, user_id, role)
      values (v_invitation.organization_id, v_user, v_invitation.role)
      on conflict do nothing;

      update invitations
      set status = 'accepted', accepted_by = v_user, accepted_at = now()
      where token = v_invitation.token;

      return new;
    end if;
  end if;

  -- Caso contrário, cria organização e rifa próprias
  v_slug := lower(regexp_replace(coalesce(v_meta->>'organization_name', 'minha-rifa'), '[^a-z0-9]+', '-', 'g'));

  insert into organizations (name, slug)
  values (coalesce(v_meta->>'organization_name', 'Minha Rifa'), v_slug)
  returning id into v_org;

  insert into organization_members (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  insert into raffles (organization_id, title, description, prize, ticket_price_cents,
                       total_numbers, default_numbers_per_sale, created_by)
  values (v_org, coalesce(v_meta->>'raffle_title', 'Minha Rifa'),
          'Rifa criada automaticamente no cadastro.', null, v_price, v_total, v_default_qty, v_user)
  returning id into v_raffle;

  -- Gera os números iniciais
  for i in 1..v_total loop
    insert into raffle_numbers (raffle_id, number, status)
    values (v_raffle, i, 'available');
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- Comentários de documentação
-- =====================================================================
comment on table raffle_numbers is 'Um número por rifa. status: available/reserved/sold.';
comment on table sale_numbers is 'Histórico imutável de números vendidos em cada venda.';
comment on function create_sale is 'Cria venda atômica: upsert comprador, reserva/vende números e registra venda.';
comment on function update_raffle_settings is 'Atualiza configurações e ajusta quantidade de números sem apagar vendidos.';
comment on function create_invitation is 'Só owner. Gera token de convite com expiração de 7 dias.';
comment on function accept_invitation is 'Usuário logado aceita convite se o e-mail bater com o perfil.';
comment on function get_invitation_preview is 'Dados mínimos do convite acessíveis anonimamente (página pública do convite).';
