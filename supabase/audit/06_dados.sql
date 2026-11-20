-- AUDITORIA 6: dados de negocio e historico de migracoes
select 'migrations' as tipo, string_agg(version, ', ' order by version) as detalhe
from supabase_migrations.schema_migrations
union all
select 'profiles', string_agg(id::text || ' | ' || email || ' | ' || role, ' ;; ') from public.profiles
union all
select 'org_members', string_agg(user_id::text || ' | role=' || role, ' ;; ') from public.organization_members
union all
select 'raffles', string_agg(id::text || ' | ' || title || ' | ' || status || ' | total=' || total_numbers::text || ' | preco=' || ticket_price_cents::text, ' ;; ') from public.raffles
union all
select 'numeros_status', status || '=' || count(*)::text from public.raffle_numbers group by status;
