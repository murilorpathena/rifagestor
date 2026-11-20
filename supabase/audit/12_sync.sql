-- AUDITORIA 12: profiles x auth.users (diferenca)
select
  u.id,
  u.email,
  u.created_at,
  p.id is not null as tem_profile,
  p.name as profile_name,
  p.role as profile_role
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- members x profiles
select
  om.user_id,
  om.role as member_role,
  p.email,
  p.role as profile_role
from public.organization_members om
left join public.profiles p on p.id = om.user_id
order by om.user_id;
