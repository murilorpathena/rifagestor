-- AUDITORIA 16: storage buckets (comprovantes) - query unica
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
from storage.buckets
order by name;
