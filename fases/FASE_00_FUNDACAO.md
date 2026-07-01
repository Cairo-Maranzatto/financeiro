# Fase 0 — Fundação Técnica & Arquitetura Base

> Bounded Context: transversal (Identity & Access + infraestrutura). Ver [INDICE.md](INDICE.md) para visão geral das fases.

## Objetivo

Preparar toda a base técnica e arquitetural antes de qualquer feature de negócio. Nenhuma fase seguinte deve precisar "voltar" para corrigir fundação (RLS, auditoria, soft delete, stack).

## Pré-requisitos

Nenhum — ponto de partida do projeto.

## Passos de Desenvolvimento

### 1. Setup do repositório

1.1. Criar o projeto: `pnpm create next-app@latest` com TypeScript, Tailwind, App Router, ESLint.
1.2. Estruturar pastas no padrão Feature First (Seção 17 do planejamento macro):

```
/src
  /features
    /identity
    /accounts
    /transactions
    /credit-cards
    /planning
    /loans
    /dashboard
  /shared
    /domain        (Value Objects: Money, DateRange, etc.)
    /ui             (componentes shadcn/ui compartilhados)
    /supabase       (client factory, tipos gerados)
```

1.3. Instalar shadcn/ui (`pnpm dlx shadcn@latest init`), TanStack Query, Zod, React Hook Form.
1.4. Configurar Husky + lint-staged + Prettier (pre-commit roda lint + format).

### 2. Setup do Supabase

2.1. Criar projeto no Supabase (produção).
2.2. Instalar Supabase CLI, rodar `supabase init` e `supabase start` para ambiente local via Docker.
2.3. Criar `.env.local` (não commitado) e `.env.example` (commitado, sem valores reais) com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side, nunca exposta ao client).

### 3. Schema base e convenções (migrations versionadas)

3.1. Habilitar/criar função de geração de **UUIDv7** (decisão da Seção 25/RNF05) — extensão `pg_uuidv7` ou função PL/pgSQL própria. Todas as tabelas de domínio usam `id uuid PRIMARY KEY DEFAULT uuid_generate_v7()`.
3.2. Criar tabela `user_settings`:

```sql
create table public.user_settings (
  id uuid primary key references auth.users(id),
  language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  financial_month_start_day int not null default 1,
  plan_id text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

3.3. Criar tabela `system_categories` (catálogo global, seed via migration, somente leitura para o app) com categorias padrão (Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Salário, Investimentos, etc.), cada uma com `type` (Receita/Despesa/Ambas).
3.4. Criar função/trigger genérica de auditoria `set_audit_fields()`, aplicada via trigger `BEFORE INSERT OR UPDATE` em toda tabela de domínio criada a partir daqui, populando `created_by`/`updated_by` via `auth.uid()`. Definir como padrão obrigatório: toda nova tabela de domínio inclui `user_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by` (RNF05).

### 4. RLS (Row Level Security)

4.1. Habilitar RLS em **toda** tabela de domínio no momento em que ela é criada — nunca deixar uma tabela sem policy, mesmo que temporariamente.
4.2. Policy padrão (ajustar por tabela conforme necessário):

```sql
alter table public.user_settings enable row level security;
create policy "select_own" on public.user_settings for select using (auth.uid() = id);
create policy "update_own" on public.user_settings for update using (auth.uid() = id);
```

4.3. Para tabelas com `user_id` e soft delete:

```sql
create policy "select_own_not_deleted" on public.<tabela>
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "insert_own" on public.<tabela>
  for insert with check (auth.uid() = user_id);
create policy "update_own" on public.<tabela>
  for update using (auth.uid() = user_id);
```

4.4. **Teste manual obrigatório de RLS:** criar 2 usuários de teste, inserir dados com cada um, confirmar via SQL editor (autenticado como cada usuário) que nenhum vê dados do outro.

### 5. Soft Delete

5.1. Criar helper no client (`/src/shared/supabase/soft-delete.ts`) que sempre faz `UPDATE deleted_at = now()`, nunca `DELETE`.
5.2. Garantir que toda query de leitura filtra `deleted_at IS NULL` — via RLS (passo 4.3) já é garantido a nível de banco, então o client não precisa repetir o filtro manualmente.

### 6. CI/CD inicial

6.1. GitHub Actions: workflow disparado em PR com steps `lint` → `typecheck` → `build`.
6.2. Conectar repositório à Vercel (Preview Deployments automáticos por PR).

### 7. Autenticação (Identity)

7.1. Configurar Supabase Auth (email/senha — RF01). Telas: Login, Cadastro, Recuperação de senha.
7.2. Trigger de onboarding (`on_auth_user_created`, dispara em `auth.users` AFTER INSERT): popula `user_settings` com defaults e copia `system_categories` para a tabela `categories` do novo usuário, preenchendo `system_category_id` em cada linha (Seção 28).
7.3. Middleware do Next.js para proteger rotas autenticadas e redirecionar usuários não logados.

### 8. PWA shell mínimo

8.1. Configurar `manifest.json`, ícones (vários tamanhos) e Service Worker básico (cache de assets estáticos por enquanto — o cache de dados vem na Fase 3).
8.2. Validar que o navegador oferece "Adicionar à tela inicial" mesmo com o app ainda vazio.

## Critérios de Conclusão da Fase 0

- [ ] Um novo usuário consegue se cadastrar e logar.
- [ ] Ao logar pela primeira vez, já existem categorias padrão associadas à conta dele (copiadas de `system_categories`).
- [ ] RLS comprovadamente isola dados entre 2 usuários de teste (testado manualmente).
- [ ] Pipeline de CI roda lint/typecheck/build em cada PR sem intervenção manual.
- [ ] App é instalável como PWA (mesmo vazio).
- [ ] Toda tabela criada até aqui tem RLS habilitado e trigger de auditoria funcionando.

## Riscos Específicos desta Fase

- Um erro na trigger de auditoria ou na trigger de onboarding é um risco **silencioso**: ele não quebra a tela, mas corrompe dados em todas as fases seguintes sem aviso. Testar exaustivamente com múltiplos usuários antes de avançar para a Fase 1.
- Esquecer de habilitar RLS em uma tabela nova é o erro mais caro do projeto (vaza dados entre usuários). Adotar a regra: nenhum PR que crie tabela é aprovado sem a policy correspondente no mesmo PR.
