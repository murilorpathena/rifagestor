-- AUDITORIA 2: contagem de linhas de cada tabela
select 'profiles' as tabela, count(*) from public.profiles
union all select 'organizations', count(*) from public.organizations
union all select 'organization_members', count(*) from public.organization_members
union all select 'raffles', count(*) from public.raffles
union all select 'raffle_numbers', count(*) from public.raffle_numbers
union all select 'buyers', count(*) from public.buyers
union all select 'sales', count(*) from public.sales
union all select 'sale_numbers', count(*) from public.sale_numbers
order by 1;
