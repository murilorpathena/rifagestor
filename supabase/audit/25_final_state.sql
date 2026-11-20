-- AUDITORIA 25: estado final dos dados - query unica
select
  'profiles' as tabela,
  count(*)::text as total,
  string_agg(email || ' (' || role || ')', ', ' order by email) as detalhe
from public.profiles
union all
select 'auth.users', count(*)::text, string_agg(email, ', ' order by email)
from auth.users
union all
select 'buyers', count(*)::text, string_agg(name, ', ' order by name) from public.buyers
union all
select 'sales', count(*)::text, string_agg(id::text, ', ') from public.sales
union all
select 'sale_numbers', count(*)::text, '' from public.sale_numbers
union all
select 'organization_members', count(*)::text, '' from public.organization_members
union all
select 'invitations', count(*)::text, '' from public.invitations;
