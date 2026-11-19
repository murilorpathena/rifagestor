-- Tabela de logs para heartbeat do projeto (evita pausa por inatividade do Supabase).
-- Uma função `public.ping_log()` insere um registro; um cron externo (Edge Function
-- agendada, GitHub Actions, etc.) deve chamá-la a cada 3 dias.

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;

-- Somente admin lê os logs.
drop policy if exists "logs admin read" on public.logs;
create policy "logs admin read" on public.logs
  for select to authenticated
  using (public.is_admin());

-- Qualquer usuário autenticado pode inserir (chamada do cron interno/externo).
drop policy if exists "logs authenticated insert" on public.logs;
create policy "logs authenticated insert" on public.logs
  for insert to authenticated
  with check (true);

grant all on public.logs to authenticated;

-- Função de ping que registra um log. Pode ser chamada por RPC a cada 3 dias.
create or replace function public.ping_log()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.logs (message)
  values ('heartbeat - ' || now()::text);
end;
$$;

grant execute on function public.ping_log() to authenticated;
