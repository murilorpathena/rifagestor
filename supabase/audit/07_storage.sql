-- AUDITORIA 7: storage buckets e policies de storage
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select policyname, tablename, cmd, roles::text, qual, with_check
from pg_policies
where schemaname='storage'
order by tablename, policyname;
