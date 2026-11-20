-- AUDITORIA / CORRECOES (producao):
--  1) Inscreve as tabelas na publication supabase_realtime (tempo real das telas).
--  2) Faz backfill de profiles para auth.users criados fora do app (sem profile).
--  3) Endurece o bucket "comprovantes": limite de tamanho, mime e escopo por org.
--  4) Helper SECURITY DEFINER para checar acesso a comprovante por organizacao.

-- ---------------------------------------------------------------------------
-- 1) REALTIME -----------------------------------------------------------------
-- Sem isto a publication fica vazia e nenhuma tela recebe updates ao vivo.
do $$
declare
  t text;
  alvo text[] := array[
    'public.sales',
    'public.sale_numbers',
    'public.raffle_numbers',
    'public.buyers',
    'public.raffles',
    'public.profiles',
    'public.organization_members',
    'public.invitations',
    'public.telegram_config'
  ];
begin
  -- garante que a publication exista (idempotente)
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array alvo loop
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname = split_part(t, '.', 2)
    ) then
      begin
        execute format('alter publication supabase_realtime add table %s', t);
      exception when duplicate_object then
        null; -- ja inscrita
      end;
    end if;
  end loop;
end $$;

-- replica identity full: garante payload completo em UPDATE/DELETE no realtime
alter table public.sales replica identity full;
alter table public.sale_numbers replica identity full;
alter table public.raffle_numbers replica identity full;
alter table public.buyers replica identity full;
alter table public.raffles replica identity full;
alter table public.profiles replica identity full;

-- ---------------------------------------------------------------------------
-- 2) BACKFILL DE PROFILES -----------------------------------------------------
-- Usuarios criados pelo Dashboard/Admin API antes do trigger existir ficam
-- sem profile e portanto sem papel, sem vinculo e invisiveis no app.
insert into public.profiles (id, name, email, role)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email),
  u.email,
  case
    when u.raw_user_meta_data ->> 'role' in ('admin', 'gestor', 'vendedor')
      then u.raw_user_meta_data ->> 'role'
    else 'vendedor'
  end
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      role = excluded.role;

-- ---------------------------------------------------------------------------
-- 3) STORAGE: helper de escopo por organizacao -------------------------------
create or replace function public.can_access_sale_storage(p_sale_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sales s
    where s.id = p_sale_id
      and (
        public.is_admin()
        or public.is_org_manager(s.organization_id)
        or s.seller_id = p_user
      )
  );
$$;

grant execute on function public.can_access_sale_storage(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) STORAGE: limites e policies do bucket "comprovantes" --------------------
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'comprovantes';

-- upload: apenas o dono da venda (primeira pasta = sale_id) pode gravar
drop policy if exists "comprovantes upload" on storage.objects;
create policy "comprovantes upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and public.can_access_sale_storage(
      (storage.foldername(name))[1]::uuid,
      auth.uid()
    )
  );

-- leitura: apenas quem pode ver a venda
drop policy if exists "comprovantes read" on storage.objects;
create policy "comprovantes read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.can_access_sale_storage(
      (storage.foldername(name))[1]::uuid,
      auth.uid()
    )
  );

-- remocao: apenas quem pode ver a venda
drop policy if exists "comprovantes delete own" on storage.objects;
create policy "comprovantes delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.can_access_sale_storage(
      (storage.foldername(name))[1]::uuid,
      auth.uid()
    )
  );
