-- AUDITORIA 24: FKs de raffle_numbers (sale_id / buyer_id) - query unica
select
  con.conname as constraint_name,
  con.conrelid::regclass::text as tabela,
  pg_get_constraintdef(con.oid) as definicao,
  case con.confdeltype
    when 'a' then 'NO ACTION'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
  end as on_delete
from pg_constraint con
where con.contype = 'f'
  and con.conrelid = 'public.raffle_numbers'::regclass
order by 1;
