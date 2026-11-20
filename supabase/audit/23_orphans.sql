-- AUDITORIA 23: numeros vendidos sem venda correspondente (orfãos)
select
  rn.id,
  rn.number,
  rn.status,
  rn.sale_id,
  rn.buyer_id,
  s.id is not null as venda_existe,
  b.id is not null as comprador_existe
from public.raffle_numbers rn
left join public.sales s on s.id = rn.sale_id
left join public.buyers b on b.id = rn.buyer_id
where rn.status <> 'available'
order by rn.number
limit 20;
