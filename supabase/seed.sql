-- Dados base do app de rifa única (executar no ambiente de produção).
-- O admin já existe em auth.users; aqui garantimos o profile e a rifa que ele vai configurar.

insert into public.profiles (id, name, email, role)
values (
  'db99e183-3351-4ac7-ae15-3013a09f91b2',
  'Administrador',
  'mrp@adm.com',
  'admin'
)
on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      role = 'admin';

insert into public.organizations (id, name, slug)
values (
  'b7a1c2d3-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
  'Rifa da Amiga',
  'rifa-da-amiga'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values (
  'b7a1c2d3-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
  'db99e183-3351-4ac7-ae15-3013a09f91b2',
  'owner'
)
on conflict (organization_id, user_id) do nothing;

insert into public.raffles (
  id, organization_id, title, description, prize, draw_date,
  ticket_price_cents, total_numbers, default_numbers_per_sale,
  status, created_by
)
values (
  'c8b2d3e4-5f60-4b7c-9d0e-1f2a3b4c5d6e',
  'b7a1c2d3-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
  'Rifa da Amiga',
  'Configure os detalhes da rifa na tela de gestão.',
  null,
  null,
  2000,
  100,
  1,
  'active',
  'db99e183-3351-4ac7-ae15-3013a09f91b2'
)
on conflict (id) do nothing;

insert into public.raffle_numbers (raffle_id, number, status)
select 'c8b2d3e4-5f60-4b7c-9d0e-1f2a3b4c5d6e', g, 'available'
from generate_series(1, 100) as g
on conflict (raffle_id, number) do nothing;
