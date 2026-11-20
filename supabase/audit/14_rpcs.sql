-- AUDITORIA 14: TODAS as funcoes public (RPCs) e sua assinatura
select
  p.proname as rpc,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as retorno,
  p.prosecdef as security_definer,
  case p.prokind when 'p' then 'procedure' else 'function' end as tipo
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname;
