# RifaGestor

App interno e mobile-first para gerenciar **uma única rifa** (não é SaaS, não é rifa online com cadastro público). Frontend 100% estático; **Supabase é o único backend** (Auth + Postgres + RLS + RPCs + Edge Function).

## O que o sistema faz

- **Acesso somente por login.** Não existe cadastro público. Admin inicial: `rifa@adm.com` / `adm@123` (troque a senha depois).
- **Papéis:** administrador gerencia tudo; gestor cadastra vendedores e gerencia a rifa; vendedor registra vendas e vê apenas as suas.
- **Usuários:** criados em `/admin/usuarios` pelo admin/gestor. A senha é gerada no frontend e exibida **uma única vez** para ser entregue ao usuário. O admin também pode redefinir senhas e remover contas; o gestor só cria vendedores da própria organização.
- **Painel:** números livres/vendidos/reservados, compradores, receita de vendas pagas e últimas vendas.
- **Grade de números:** reservar/liberar manualmente; ao reduzir o total da rifa, números vendidos/reservados são preservados.
- **PDV mobile-first:** comprador (nome, CPF, WhatsApp e e-mail opcional), seleção de números, pagamento **registrado manualmente** (`pix | cash | card | other`) e status `paid | pending`. Não há integração com meios de pagamento.
- **Histórico de vendas:** filtro por papel (vendedor vê só as suas) e ações de marcar como pago/cancelar para quem pode gerenciar.
- **Configurações da rifa:** título, prêmio, descrição, data do sorteio, status, preço por número, total de números e números por venda. Fica em `/configuracoes`.

## Stack

- **Frontend:** Next.js 16.4.6 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Backend:** Supabase (Postgres, Auth, RLS, RPCs `SECURITY DEFINER`, Edge Function `create-user`).
- **Deploy:** site estático (`output: "export"`, `publish = "out"`). `netlify.toml` pronto para Netlify; também funciona na Vercel. Sem servidor próprio e sem service role key no frontend.

## Estrutura

```
supabase/
  migrations/            # schema, RLS, RPCs e correções (aplicar em ordem)
  seed.sql               # admin, organização, rifa e 100 números
  functions/create-user/ # criação/remoção de usuários e troca de senha
src/
  app/                   # rotas (painel, numeros, vendas, equipe, configuracoes, admin/usuarios, entrar, perfil...)
  components/            # app shell, navegação mobile/desktop, formulários, cards
  hooks/                 # cliente Supabase compartilhado por aba
  lib/                   # supabase.ts, utils.ts, validation.ts, sale.ts (regras do PDV), types.ts
tests/                   # vitest: helpers de validação/ formatação e regras puras do PDV
```

## 1. Configurar o Supabase

Em um projeto novo, aplique as migrations na ordem (o comando abaixo aplica todas as pendentes):

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push --remote
```

Ordem dos arquivos relevantes:

```
20251118000000_initial.sql
20251118000002_fix_trigger.sql
20251118000003_roles_and_admin.sql
20251118000004_update_trigger_and_rls.sql
20251119000000_seller_rls_and_fix_sale.sql
20251120000000_single_raffle_admin.sql       # rifa única, helpers e RPCs de grade
20251120000001_fix_profile_rls_recursion.sql  # corrige 42P17 em profiles
20251120000002_grants.sql                     # GRANTs para authenticated
20251120000003_fix_all_rls_recursion.sql      # remove recursão nas demais tabelas
```

> As duas últimas correções de RLS e a de grants são necessárias: sem elas, o app recebe `42P17` (recursão em policy) ou `403` (falta de `GRANT`).

Depois:

1. Crie o usuário admin em **Authentication → Users → Add user** com `rifa@adm.com` / `adm@123` (e-mail confirmado). O `seed.sql` **pressupõe** que este usuário já existe.
2. Aplique o seed: `supabase db query --remote --yes --file supabase/seed.sql`. Ele cria o profile admin, a organização `Rifa da Amiga`, a rifa e os 100 números. Se você usar outro e-mail/ID para o admin, ajuste os UUIDs no seed.
3. Faça o deploy da Edge Function: `supabase functions deploy create-user`. Ela usa `SUPABASE_SERVICE_ROLE_KEY` no ambiente da função — nunca no frontend.
4. Em **Project Settings → API**, copie `Project URL` e a chave `anon public` para as variáveis de ambiente.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLIC"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Use as mesmas variáveis na plataforma de deploy (em `NEXT_PUBLIC_APP_URL`, coloque a URL pública da aplicação).

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e entre com o admin.

## 4. Testes e build

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # gera out/
```

Os 19 testes cobrem código de produção real: `src/lib/utils.ts`, `src/lib/validation.ts` e `src/lib/sale.ts` (regras do PDV). Eles **não** simulam cobertura de providers React, RPCs SQL ou da Edge Function; esses fluxos foram validados manualmente no navegador.

## 5. Deploy

- **Netlify:** o `netlify.toml` já define `command = "npm run build"`, `publish = "out"` e Node 20. Desative o plugin `@netlify/plugin-nextjs` se ele estiver ativo (entra em conflito com `out`).
- **Vercel:** framework Next.js, `output: "export"`, diretório de saída `out`. Cadastre as mesmas variáveis de ambiente.

## 6. Fluxo de uso

1. Entre como admin e, se quiser, troque a senha em `/perfil`.
2. Em `/configuracoes`, ajuste título, prêmio, preço, total de números e demais dados da rifa. Ao aumentar o total, a grade é ampliada automaticamente; ao diminuir, apenas números ainda livres acima do novo total são removidos.
3. Em `/admin/usuarios`, crie gestores/vendedores e entregue a senha gerada a cada um.
4. Vendedores usam `/vendas` para registrar vendas e `/vendas/historico` para acompanhar as suas. Gestores/admin podem reservar números em `/numeros` e alterar status de vendas no histórico.

## Segurança

- Todas as tabelas usam **RLS**. Usuários só acessam dados da própria organização; vendedores veem apenas suas vendas.
- As verificações de permissão usam funções `SECURITY DEFINER` (`is_admin`, `is_org_member`, `is_org_manager`, `is_org_manager_of_raffle`) para evitar recursão nas policies.
- Escritas sensíveis (venda, grade e gerenciamento de usuários) passam por RPCs/Edge Function que validam papel e vínculo com a organização.
- CPF é armazenado apenas com dígitos e é único por organização.
- A chave de serviço do Supabase aparece somente na Edge Function; o bundle público usa apenas a chave anon.
