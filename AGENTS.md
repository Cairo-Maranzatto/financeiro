# AGENTS.md — Guia Operacional para Agentes e Automações

Este documento fornece uma visão técnica e operacional resumida para agentes de IA e desenvolvedores que atuam neste repositório.

## 1. Visão Geral do Repositório

Hub de inteligência financeira pessoal (PWA) construído com foco em escalabilidade para SaaS e automações de IA.

- **Stack Principal:** Next.js 16.2.9 (App Router), TypeScript, Supabase (DB/Auth/RLS), Tailwind CSS 4, TanStack Query, Zod.
- **Status:** MVP concluído e em produção. Aprimoramentos de categorias e Dashboard analítico (Relatórios) implementados.

## 2. Estrutura e Subprojetos

O projeto segue uma arquitetura **Feature First**.

- `/src/features`: Domínios de negócio (accounts, credit-cards, transactions, planning, identity, dashboard, llm, search, reports). Cada feature contém sua própria lógica de `/api`, `/components`, `/domain` e `/hooks`.
- `/src/shared`: Recursos compartilhados (UI components via shadcn, hooks globais, value objects de domínio, cliente Supabase).
- `/src/app`: Estrutura de rotas e layouts do Next.js.
- `/supabase`: Migrations SQL e tipos gerados via Supabase CLI.
- `/fases`: Documentação do plano de execução e histórico de progresso.
- `/e2e`: Testes de integração ponta a ponta com Playwright.

## 3. Como Instalar / Restaurar Dependências

O projeto utiliza `pnpm` v11+.

```bash
pnpm install
```

## 4. Como Rodar Localmente

1. **Ambiente:** Copie `.env.example` para `.env.local` e configure as chaves do Supabase.
2. **Banco (opcional):** Para rodar o banco localmente (requer Docker):
   ```bash
   supabase start
   ```
3. **App:**
   ```bash
   pnpm dev
   ```

## 5. Como Testar / Buildar / Lintar

- **Build:** `pnpm build` (Verifica tipos e gera bundle de produção)
- **Testes Unitários:** `pnpm test` (Vitest - focado em lógica de domínio e componentes)
- **Testes E2E:** `pnpm e2e` (Playwright)
- **Lint/Format:** `pnpm lint` e `pnpm format`
- **Typecheck:** `pnpm typecheck`

## 6. Convenções e Arquitetura

- **Sem ORM:** Utiliza `@supabase/supabase-js` diretamente com TanStack Query para gestão de estado e cache.
- **Identificadores:** Uso obrigatório de **UUIDv7** para todas as Primary Keys.
- **Value Objects:** Lógica de dinheiro, datas e status reside em `src/shared/domain`. **Nunca** some moedas diferentes sem conversão.
- **Soft Delete:** Nunca use `DELETE` físico. Todas as tabelas de domínio possuem `deleted_at`.
- **Validação:** Zod é a fonte da verdade para schemas de formulários e contratos de API.

## 7. Regras Importantes para Alterações

- **RLS (Row Level Security):** Obrigatório em todas as tabelas. Toda nova tabela deve ter políticas de segurança que garantam `auth.uid() = user_id`.
- **Saldo de Conta:** Nunca armazene o saldo em uma coluna. Ele deve ser calculado _on-the-fly_ somando transações pagas.
- **Saldo Inicial:** É uma transação de sistema (categoria "Saldo Inicial"), não um campo na tabela de contas.
- **Categorias:** Apenas subcategorias (folhas da árvore) podem receber lançamentos. Orçamentos (`budgets`) são definidos apenas no nível de categorias-pai.
- **Transferências:** Devem ser tratadas de forma atômica (criação de entrada e saída juntas).
- **Empréstimos:** A tabela `loans` usa a coluna `direction` (`tomado`/`concedido`) para distinguir dívida de crédito. A quitação de parcelas gera `despesa` para `tomado` e `receita` para `concedido`.

## 8. Riscos e Armadilhas Conhecidas

- **Timezones:** O fechamento de faturas de cartão de crédito deve respeitar o timezone do usuário, não UTC puro. Use `resolveFinancialMonth()`.
- **Patrimônio Líquido:** Deve ser exibido segregado por moeda (BRL, USD, BTC) conforme decisão de produto.
- **Next.js 16:** O middleware usa `src/proxy.ts` (`export { proxy }`), pois `middleware.ts` foi depreciado nesta versão.
- **Sentry:** Configurado em `src/instrumentation.ts` devido à incompatibilidade com Turbopack no arquivo de config padrão.

## 9. Observação de Segurança e Configuração

- **Secrets:** Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no client-side.
- **Vercel Cron:** Tarefas agendadas (fechamento de faturas às 03:00 UTC e recorrências às 04:00 UTC) são configuradas via `vercel.json`.
- **Auditoria:** Triggers de banco gerenciam automaticamente os campos `created_by` e `updated_by`.

Para detalhes profundos sobre requisitos de negócio, consulte `PLANEJAMENTO_SISTEMA_FINANCEIRO.md` e `MEMORY_BANK.md`.
