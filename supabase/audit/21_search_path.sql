-- AUDITORIA 21: funcoes SECURITY DEFINER sem search_path fixo - query unica
select
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as args,
  p.proconfig::text as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) c where c like 'search_path=%'
  ))
order by 1;
