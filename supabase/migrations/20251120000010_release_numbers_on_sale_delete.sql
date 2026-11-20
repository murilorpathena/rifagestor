-- AUDITORIA / CORRECOES (producao):
--  BUG: ao excluir uma venda (limpeza, reset, cascata), os numeros linked
--  ficavam com status 'sold'/'reserved' e sale_id = NULL (a FK e SET NULL).
--  Como create_sale so escolhe numeros com status = 'available', esses
--  numeros ficavam travados para sempre e a rifa "perdia" digitos.
--
--  Solucao: trigger BEFORE DELETE em sales que libera os numeros ANTES do
--  ON DELETE SET NULL da FK agir (assim a FK ja nao encontra referencia).

create or replace function public.release_numbers_on_sale_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.raffle_numbers
  set status = 'available',
      sale_id = null,
      buyer_id = null,
      updated_at = now()
  where sale_id = old.id;

  return old;
end;
$$;

grant execute on function public.release_numbers_on_sale_delete() to service_role;

drop trigger if exists trg_sales_release_numbers on public.sales;
create trigger trg_sales_release_numbers
before delete on public.sales
for each row execute function public.release_numbers_on_sale_delete();

-- Limpeza dos orfaos ja existentes no banco (numeros sem venda asociada).
update public.raffle_numbers rn
set status = 'available',
    sale_id = null,
    buyer_id = null,
    updated_at = now()
where rn.status <> 'available'
  and (rn.sale_id is null or not exists (select 1 from public.sales s where s.id = rn.sale_id));
