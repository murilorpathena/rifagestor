-- AUDITORIA 10: estrutura real da tabela profiles (colunas e defaults)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='profiles'
order by ordinal_position;

-- triggers de auth.users (criacao de profile no signup)
select t.tgname, c.relname, p.proname, pg_get_triggerdef(t.oid) as def
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='auth' and c.relname='users' and not t.tgisinternal
order by 1;
