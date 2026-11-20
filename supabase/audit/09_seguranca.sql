-- AUDITORIA 9: view de organizacao/membership e checagem de recursao 42P17
-- Testa se as funcoes helper nao entram em recursao (stack_depth)
select
  'is_admin' as fn,
  (select count(*) from public.is_admin()) as resultado
union all
select 'is_org_member', (select count(*) from public.is_org_member())::int
union all
select 'is_org_manager', (select count(*) from public.is_org_manager())::int;

-- Verifica se anon tem acesso indevido
select
  has_table_privilege('anon','public.profiles','select') as anon_select_profiles,
  has_table_privilege('anon','public.sales','select') as anon_select_sales,
  has_table_privilege('anon','public.raffle_numbers','select') as anon_select_numeros,
  has_table_privilege('anon','public.sales','insert') as anon_insert_sales,
  has_table_privilege('anon','public.profiles','update') as anon_update_profiles,
  has_table_privilege('anon','public.sales','delete') as anon_delete_sales;
