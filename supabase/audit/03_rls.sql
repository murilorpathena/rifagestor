-- AUDITORIA 3: politicas RLS por tabela
select
  tablename,
  policyname,
  cmd,
  permissive,
  roles::text,
  qual,
  with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;
