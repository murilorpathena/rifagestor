-- AUDITORIA 1: tabelas public, colunas e contagem de linhas
select
  c.relname as tabela,
  c.relrowsecurity as rls,
  (select count(*) from information_schema.columns col
     where col.table_schema='public' and col.table_name=c.relname) as colunas
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;
