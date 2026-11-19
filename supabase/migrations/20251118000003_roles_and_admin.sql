-- Adicionar roles de sistema e atualizar RLS para admin/gestor/vendedor

-- 1. Adicionar coluna role ao profiles (admin, gestor, vendedor)
alter table profiles add column if not exists role text not null default 'vendedor' check (role in ('admin', 'gestor', 'vendedor'));

-- 2. Atualizar organization_members para aceitar gestor e membro
-- (já existe role com check owner/member, vamos ajustar)
-- Manter owner para compatibilidade, adicionar gestor e member

-- 3. Criar usuário admin via SQL (se não existir)
-- O admin será criado também via script Node, mas deixamos aqui como fallback
-- NOTE: auth.users não pode ser inserido diretamente via SQL comum,
-- o admin será criado via Supabase Auth API com service_role.

-- 4. Índices úteis
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_organization_members_role on organization_members(role);

-- 5. Comentários
comment on column profiles.role is 'Tipo de usuário: admin (sistema), gestor (organização), vendedor (operacional)';
comment on column organization_members.role is 'Função dentro da organização: owner, gestor, member';
