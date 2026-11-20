-- AUDITORIA 5: funcoes (RPCs) e sua seguranca
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.provolatile,
  l.lanname as linguagem
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
join pg_language l on l.oid=p.prolang
where n.nspname='public'
order by p.proname;

-- funcoes auxiliares de RLS (is_admin, is_org_member, etc.)
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'is_%'
order by 1;
