-- AUDITORIA 20: varredura final de seguranca no schema public
select
  'funcoes sem search_path fixo' as check_name,
  count(*)::text as total,
  case when count(*) = 0 then 'OK' else 'ATENCAO' end as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) c where c like 'search_path=%'
  ))

union all
select 'funcoes SECURITY DEFINER expostas a anon',
  count(*)::text,
  case when count(*) = 0 then 'OK' else 'ATENCAO' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef = true
  and has_function_privilege('anon', p.oid, 'EXECUTE')

union all
select 'tabelas sem RLS',
  count(*)::text,
  case when count(*) = 0 then 'OK' else 'ATENCAO' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

union all
select 'tabelas com FORCE ROW LEVEL SECURITY (evitar owner bypass)',
  count(*)::text,
  'INFO'
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relforcerowsecurity

union all
select 'views sem security_invoker (exposam dados do owner)',
  count(*)::text,
  case when count(*) = 0 then 'OK' else 'ATENCAO' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v' and not c.reloptions @> ARRAY['security_invoker=on']
