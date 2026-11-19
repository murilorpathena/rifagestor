-- Configuração de notificação via Telegram (apenas admin gerencia)
create table if not exists public.telegram_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bot_token text not null,
  chat_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

alter table public.telegram_config enable row level security;

drop policy if exists "telegram_config admin all" on public.telegram_config;
create policy "telegram_config admin all" on public.telegram_config
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.telegram_config to authenticated;

-- Colunas de comprovante e notificação na tabela sales
alter table public.sales add column if not exists comprovante_url text;
alter table public.sales add column if not exists telegram_notified boolean default false;

-- Índice para consultas rápidas de vendas não notificadas
create index if not exists idx_sales_telegram_notified on public.sales(telegram_notified) where telegram_notified = false;

-- Atualiza updated_at automaticamente
drop trigger if exists trg_telegram_config_updated_at on public.telegram_config;
create trigger trg_telegram_config_updated_at
  before update on public.telegram_config
  for each row
  execute function public.set_updated_at();
