-- AUDITORIA / CORRECOES (producao):
--  BUG CRITICO: a exclusao de usuarios falhava com "Database error deleting user".
--  Causa: as FKs para auth.users usavam NO ACTION / RESTRICT, entao qualquer
--  usuario com profile (todos) ou com venda bloqueava o DELETE do auth.users.
--
--  profiles.id        -> ON DELETE CASCADE  (o profile e a identidade do usuario)
--  raffles.created_by -> ON DELETE SET NULL  (a rifa sobrevive ao admin)
--  sales.seller_id    -> ON DELETE SET NULL  (o historico de vendas sobrevive)

-- profiles -------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- raffles --------------------------------------------------------------------
alter table public.raffles
  drop constraint if exists raffles_created_by_fkey;
alter table public.raffles
  alter column created_by drop not null;
alter table public.raffles
  add constraint raffles_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

-- sales ----------------------------------------------------------------------
alter table public.sales
  drop constraint if exists sales_seller_id_fkey;
alter table public.sales
  alter column seller_id drop not null;
alter table public.sales
  add constraint sales_seller_id_fkey
  foreign key (seller_id) references auth.users(id) on delete set null;

-- organization_members ja e ON DELETE CASCADE, mas garantimos:
alter table public.organization_members
  drop constraint if exists organization_members_user_id_fkey;
alter table public.organization_members
  add constraint organization_members_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
