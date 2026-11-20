-- AUDITORIA 15b: publication do Realtime (tabelas-inscritas) - query unica
select
  pub.pubname,
  (select string_agg(tablename, ', ' order by tablename)
     from pg_publication_tables pt
    where pt.pubname = pub.pubname) as tabelas_inscritas
from pg_publication pub
order by pub.pubname;
