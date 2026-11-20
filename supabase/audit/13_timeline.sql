-- AUDITORIA 13: quando as migrations foram aplicadas vs quando o user sem profile foi criado
select
  version,
  name,
  statements
from supabase_migrations.schema_migrations
order by version;

-- historico de auth.users (via view de auditoria do proprio auth, se existir)
select
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data,
  p.id is not null as tem_profile
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
