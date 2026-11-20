-- AUDITORIA 22: colunas de sale_numbers e buyers - query unica
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema='public'
  and table_name in ('sale_numbers', 'buyers', 'sales')
order by table_name, ordinal_position;
