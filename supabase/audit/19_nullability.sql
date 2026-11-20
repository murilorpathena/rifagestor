-- AUDITORIA 19: nullability das colunas com FK para auth.users
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema='public'
  and (table_name, column_name) in (
    ('profiles','id'),
    ('raffles','created_by'),
    ('sales','seller_id'),
    ('sales','buyer_id'),
    ('buyers','organization_id')
  )
order by table_name, column_name;
