-- AUDITORIA 15: publication do Realtime (tabelas-inscritas)
select
  pub.pubname,
  pub.pubinsert,
  pub.pubupdate,
  pub.pubdelete,
  pub.pubtruncate,
  (select string_agg(tablename, ', ' order by tablename)
     from pg_publication_tables pt
    where pt.pubname = pub.pubname) as tabelas_inscritas
from pg_publication pub
order by pub.pubname;

-- replicata das tabelas (logico/physical)
select
  c.relname as tabela,
  c.relreplident as replica_identity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;
