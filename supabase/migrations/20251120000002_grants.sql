-- O projeto estava sem os grants padrão do Supabase para anon/authenticated,
-- o que causava 403 em todas as consultas do frontend mesmo com RLS correto.
-- RLS continua aplicando as regras de acesso; isto apenas libera o role para consultar.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
