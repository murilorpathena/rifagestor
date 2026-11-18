# RifaGestor

Sistema interno de gerenciamento de rifas (não é rifa online). Hospedagem do frontend na **Vercel** e backend/banco inteiro no **Supabase** (Auth + Postgres + RLS), sem servidor próprio.

## O que o sistema faz

- Cadastro de usuário com criação automática de organização e rifa
- Login/senha com sessão persistente (Supabase Auth)
- Painel com números livres/vendidos/reservados e receita
- PDV de venda mobile-first: comprador (nome, CPF, email, WhatsApp), escolha de números específicos ou automáticos, pagamento (PIX/dinheiro/cartão/outro), status pago/pendente
- Histórico de vendas
- Gestão da equipe: convite de vendedores por link, todos com acesso completo à mesma rifa
- Configurações: valor por número, quantidade de números, data do sorteio, título/prêmio

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend/Banco:** Supabase (PostgreSQL, Auth, RLS, RPCs)
- **Hospedagem:** Vercel (frontend estático, `output: "export"`)

## Estrutura de pastas

```
supabase/migrations/20251118000000_initial.sql  # Banco completo: tabelas, RLS, RPCs, trigger de cadastro
src/
  app/                    # Rotas Next.js (painel, numeros, vendas, equipe, configuracoes, convites, entrar, cadastro...)
  components/             # UI mobile-first (bottom nav, header, cards, formulários...)
  hooks/                  # Supabase client
  lib/                    # supabase.ts, utils.ts, validation.ts, types.ts
```

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** e cole todo o conteúdo de `supabase/migrations/20251118000000_initial.sql`. Execute uma vez.
3. Vá em **Project Settings > API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` (desenvolvimento) e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

No Vercel, cadastre as mesmas variáveis em **Settings > Environment Variables**. Defina `NEXT_PUBLIC_APP_URL` como a URL da sua implantação (ex.: `https://rifa-seu-projeto.vercel.app`).

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## 4. Fazer build para a Vercel

```bash
npm run build
```

O Next.js está configurado com `output: "export"` (site estático), ideal para a Vercel. Como todo o backend fica no Supabase, não há funções serverless próprias.

## 5. Fluxo de uso

1. **Cadastro:** o dono cria a conta e, no mesmo passo, define nome da rifa, valor por número, quantidade de números e números por venda. O sistema cria a organização, a rifa e todos os números automaticamente.
2. **Login:** acesso com e-mail e senha.
3. **PDV (Vendas):** selecione o comprador, escolha os números (ou deixe o sistema escolher automaticamente), informe pagamento e finalize. Os números marcam como vendidos/reservados.
4. **Equipe:** o dono convida vendedores por link. O convidado cria a conta com o mesmo e-mail e entra na mesma organização, com acesso completo à gestão.

## Segurança

- Todas as tabelas têm **RLS (Row Level Security)**. Usuários só veem dados da própria organização.
- Operações de escrita (venda, configurações, convites) são feitas via **RPCs `SECURITY DEFINER`**, que validam a associação do usuário com a organização antes de alterar dados.
- CPF é armazenado apenas com dígitos e é único por organização.

## Licença

Uso interno livre.