-- AUDITORIA 17: policies de storage - query unica
select
  policyname,
  tablename,
  cmd,
  roles::text,
  qual,
  with_check
from pg_policies
where schemaname='storage'
order by tablename, policyname;
