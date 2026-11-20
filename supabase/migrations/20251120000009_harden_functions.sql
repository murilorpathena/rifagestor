-- AUDITORIA / CORRECOES (producao) - hardening de seguranca:
--  1) Fixa `search_path = public` em todas as funcoes SECURITY DEFINER que
--     ainda nao tinham (evita hijack de search_path).
--  2) Revoga EXECUTE de `anon` e `PUBLIC` em todas as funcoes de public.
--     O app so chama RPCs com sessao autenticada; o anon nao precisa de nenhuma.
--     `authenticated` e `service_role` mantem o acesso.

-- 1) search_path fixo -------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search_path=%'
      ))
  loop
    execute format(
      'alter function public.%I(%s) set search_path = public, pg_temp',
      r.proname, r.args
    );
  end loop;
end $$;

-- 2) revoga execucao anon/public --------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public', r.signature);
    execute format('revoke execute on function %s from anon', r.signature);
    execute format('grant execute on function %s to authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end $$;
