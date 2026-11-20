-- AUDITORIA 18: foreign keys que referenciam auth.users (bloqueiam exclusao)
select
  con.conname as constraint_name,
  con.conrelid::regclass::text as tabela,
  pg_get_constraintdef(con.oid) as definicao,
  con.confdeltype as on_delete
from pg_constraint con
where con.contype = 'f'
  and con.confrelid = 'auth.users'::regclass
order by 2, 1;
