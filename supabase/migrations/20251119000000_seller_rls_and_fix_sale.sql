-- =====================================================================
-- Reforço de RLS por papel + correção do cálculo de venda
-- =====================================================================
-- Regras de visibilidade:
--   admin  -> vê tudo
--   gestor -> vê tudo da(s) sua(s) organização(ões)
--   vendedor -> vê apenas as próprias vendas, números vendidos e compradores
--               das suas vendas
-- O grid de números continua legível por todos os membros da organização
-- (necessário para o PDV escolher números disponíveis).

-- ---------------------------------------------------------------------
-- Funções auxiliares SECURITY DEFINER (evitam recursão de RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean language sql security definer stable as $$
  select public.is_admin() or exists (
    select 1
    from public.profiles p
    join public.organization_members m on m.user_id = p.id
    where p.id = auth.uid()
      and p.role in ('admin', 'gestor')
      and m.organization_id = p_org
  );
$$;

create or replace function public.is_org_manager_of_user(p_user uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members m
    where m.user_id = p_user and public.is_org_manager(m.organization_id)
  );
$$;

create or replace function public.buyer_visible_to_seller(p_buyer uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.sales
    where buyer_id = p_buyer and seller_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_org_manager(uuid) from public;
revoke all on function public.is_org_manager_of_user(uuid) from public;
revoke all on function public.buyer_visible_to_seller(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_org_manager_of_user(uuid) to authenticated;
grant execute on function public.buyer_visible_to_seller(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- profiles: admin vê todos; gestor vê perfis da sua org; usuário vê a si
-- ---------------------------------------------------------------------
drop policy if exists "profiles manager read org" on profiles;
create policy "profiles manager read org" on profiles for select using (
  public.is_org_manager_of_user(id)
);

-- ---------------------------------------------------------------------
-- organizations: admin vê todas (não possui org própria)
-- ---------------------------------------------------------------------
drop policy if exists "orgs admin read all" on organizations;
create policy "orgs admin read all" on organizations for select using (
  public.is_admin()
);

-- ---------------------------------------------------------------------
-- sales: vendedor só lê as próprias vendas
-- ---------------------------------------------------------------------
drop policy if exists "sales read org members" on sales;
drop policy if exists "sales read by role" on sales;
create policy "sales read by role" on sales for select using (
  public.is_admin()
  or public.is_org_manager(organization_id)
  or seller_id = auth.uid()
);

-- Atualização: admin/gestor podem alterar qualquer venda da org;
-- vendedor apenas as próprias.
drop policy if exists "sales update own or org" on sales;
create policy "sales update own or org" on sales for update using (
  public.is_admin()
  or public.is_org_manager(organization_id)
  or seller_id = auth.uid()
);

-- ---------------------------------------------------------------------
-- sale_numbers: herda a visibilidade da venda pai
-- ---------------------------------------------------------------------
drop policy if exists "sale_numbers read org members" on sale_numbers;
drop policy if exists "sale_numbers read by role" on sale_numbers;
create policy "sale_numbers read by role" on sale_numbers for select using (
  public.is_admin()
  or exists (
    select 1 from public.sales s
    where s.id = sale_numbers.sale_id
      and (public.is_org_manager(s.organization_id) or s.seller_id = auth.uid())
  )
);

-- ---------------------------------------------------------------------
-- buyers: vendedor só vê compradores das próprias vendas
-- ---------------------------------------------------------------------
drop policy if exists "buyers read org members" on buyers;
drop policy if exists "buyers read by role" on buyers;
create policy "buyers read by role" on buyers for select using (
  public.is_admin()
  or public.is_org_manager(organization_id)
  or public.buyer_visible_to_seller(id)
);

-- Escrita de compradores continua restrita a membros da organização.
-- (policies buyers insert/update da migration 04 permanecem)

-- ---------------------------------------------------------------------
-- invitations: apenas gestores da org podem ler/gerenciar convites
-- ---------------------------------------------------------------------
drop policy if exists "invitations read org members" on invitations;
create policy "invitations read org managers" on invitations for select using (
  public.is_admin() or public.is_org_manager(organization_id)
);

-- ---------------------------------------------------------------------
-- CORREÇÃO: create_sale usava price_cents (coluna inexistente)
-- ---------------------------------------------------------------------
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

  if p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  v_price := v_raffle.ticket_price_cents;
  if v_price is null or v_price <= 0 then
    raise exception 'Preço por número inválido.';
  end if;
  v_total := v_price * p_quantity;

  select id into v_locked from raffles where id = p_raffle_id for update;

  if array_length(p_number_ids, 1) is null then
    p_number_ids := '{}';
  end if;

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
    select array_agg(id order by number) into v_num
    from raffle_numbers
    where raffle_id = p_raffle_id and status = 'available'
    order by number
    limit p_quantity
    for update;

    if array_length(v_num, 1) is null or array_length(v_num, 1) < p_quantity then
      raise exception 'Não há números suficientes disponíveis.';
    end if;

    p_number_ids := v_num;
  end if;

  select id into v_buyer from buyers
  where organization_id = v_raffle.organization_id
    and cpf = regexp_replace(p_buyer_cpf, '\D', '', 'g');

  if not found then
    insert into buyers (organization_id, name, cpf, email, whatsapp)
    values (v_raffle.organization_id, p_buyer_name,
            regexp_replace(p_buyer_cpf, '\D', '', 'g'),
            nullif(p_buyer_email, ''), p_buyer_whatsapp)
    returning id into v_buyer;
  else
    update buyers set name = p_buyer_name,
                      email = nullif(p_buyer_email, ''),
                      whatsapp = p_buyer_whatsapp,
                      updated_at = now()
    where id = v_buyer;
  end if;

  insert into sales (organization_id, raffle_id, buyer_id, seller_id, quantity, total_cents,
                     payment_method, payment_status, notes, sold_at, paid_at)
  values (v_raffle.organization_id, p_raffle_id, v_buyer, v_user, p_quantity, v_total,
          p_payment_method, p_payment_status, p_notes,
          now(), case when p_payment_status = 'paid' then now() else null end)
  returning id into v_sale;

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

comment on function create_sale is 'Cria venda atômica: upsert comprador, reserva/vende números e registra venda com total a partir de ticket_price_cents.';
