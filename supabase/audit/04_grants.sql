-- AUDITORIA 4: grants por tabela (authenticated/anon/service_role)
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated','service_role','public')
group by table_name, grantee
order by table_name, grantee;
