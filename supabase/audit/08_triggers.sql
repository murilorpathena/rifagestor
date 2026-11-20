-- AUDITORIA 8: triggers (autenticacao de novo usuario -> profile)
select
  t.tgname,
  c.relname as tabela,
  p.proname as funcao,
  t.tgenabled
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and not t.tgisinternal
order by c.relname, t.tgname;
