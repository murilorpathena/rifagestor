-- AUDITORIA 11: definicao das funcoes handle_new_user e helpers
select pg_get_functiondef(p.oid) as definicao
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='handle_new_user';
