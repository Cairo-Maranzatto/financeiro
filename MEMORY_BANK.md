# Memory Bank — Histórico Vivo do Projeto

> Este arquivo é a memória persistente do projeto entre sessões de desenvolvimento (humanas ou com agentes de IA). Ele **não substitui** o [PLANEJAMENTO_SISTEMA_FINANCEIRO.md](PLANEJAMENTO_SISTEMA_FINANCEIRO.md) (o "o quê" e o "porquê" arquitetural completo) nem o [AGENTS.md](AGENTS.md) (a referência estrutural estável) — ele registra o que **realmente aconteceu** ao longo do tempo: decisões tomadas durante a implementação, progresso real por fase, problemas encontrados e perguntas ainda sem resposta.

## Como usar este arquivo (protocolo)

1. **No início de toda sessão de trabalho relevante:** leia "Contexto Atual" e as últimas 2-3 entradas de "Linha do Tempo de Progresso" antes de decidir o que fazer.
2. **No final de toda sessão de trabalho relevante:** atualize "Contexto Atual" e adicione uma nova entrada em "Linha do Tempo de Progresso".
3. **Sempre que uma decisão arquitetural ou de produto for tomada (ou revista) durante a implementação:** adicione uma entrada em "Log de Decisões" — nunca apague uma decisão antiga, registre a mudança como uma nova entrada que referencia a anterior.
4. **Sempre que um bug não-óbvio, uma limitação ou uma dívida técnica for descoberta:** registre em "Problemas Conhecidos e Dívida Técnica" — isso evita redescobrir o mesmo problema duas vezes.
5. Convenção de ordenação: cada seção cronológica tem as entradas **mais recentes no topo**.
6. Este arquivo cresce com o projeto. Não reescreva o histórico — apenas adicione. Se uma seção ficar muito longa, mova entradas antigas para `fases/historico/` mantendo aqui apenas um resumo + link.

---

## Contexto Atual

_(Atualizado em: 2026-07-02)_

- **Fase do projeto:** 🟢 **MVP em produção.** Todas as Fases 0–6 concluídas e deployadas.
- **URL de produção:** https://financeiro-virid-phi.vercel.app/
- **Estado do repositório:** tudo commitado e sincronizado com GitHub (`master`). CI verde.
- **Infraestrutura ativa:**
  - Supabase cloud (project `xtyrsoeyreicinlvycwk`) — 7 migrations aplicadas, RLS ativo em todas as tabelas.
  - Vercel — Next.js 16.2.9, cron jobs ativos (`close-invoices` 03h UTC, `generate-recurrences` 04h UTC).
  - GitHub Actions CI — lint → typecheck → vitest → build em cada push/PR.
- **Pendências abertas (não bloqueiam uso):**
  - Trocar senha do banco Supabase (Project Settings → Database → Reset password) — senha `Senha984746@` foi exposta no histórico do chat.
  - Configurar DSN do Sentry (opcional — app funciona sem; erros ficam invisíveis sem ele).
  - Criar conta de teste isolada para rodar os testes E2E Playwright em CI (`TEST_EMAIL`/`TEST_PASSWORD`).
- **Próximas evoluções possíveis (V2):** exportação CSV, conversão cambial, notificações push, gráficos (recharts), Open Finance.

---

## Linha do Tempo de Progresso

_(Mais recente no topo. Uma entrada por sessão/marco relevante.)_

### 2026-07-02 — MVP em produção: deploy Vercel + configuração Supabase Auth

1. **Deploy na Vercel** concluído — repositório conectado, preset Next.js detectado automaticamente, pnpm detectado via `pnpm-lock.yaml`. URL de produção: https://financeiro-virid-phi.vercel.app/
2. **Env vars configuradas** na Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
3. **Supabase Auth configurado** para domínio de produção: Site URL e Redirect URLs atualizadas para `https://financeiro-virid-phi.vercel.app` e `https://financeiro-virid-phi.vercel.app/auth/callback`.
4. **Build and Output Settings** mantidos como default da Vercel (não customizados) — Vercel detecta pnpm + Next.js automaticamente.
5. Todas as fases do MVP validadas em produção.

### 2026-07-01 — Fase 6 (Hardening & Lançamento): observabilidade, E2E, CI, deploy config

1. **Sentry:** instalado `@sentry/nextjs`. `src/instrumentation.ts` com `register()` hook (SECURITY DEFINER = Turbopack-compatível, não usa `withSentryConfig`). `src/app/global-error.tsx` como boundary de erros client-side. `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` adicionados ao `.env.example`.
2. **Logger estruturado:** `src/shared/lib/logger.ts` — `log(level, event, meta)` → JSON em `console.log/warn/error`. Adicionado a 5 Route Handlers críticos: `transfer`, `pay-invoice`, `close-invoices`, `generate-recurrences`, `loans/create`.
3. **Playwright E2E:** `playwright.config.ts` configurado, `@playwright/test` instalado como devDependency. 3 golden paths em `e2e/`: Auth+Conta+Transação, Cartão+Fatura+Pagamento, Orçamento+Meta+Empréstimo. Todos pulam graciosamente se `TEST_EMAIL`/`TEST_PASSWORD` não estiverem definidos.
4. **vercel.json:** cron jobs configurados — `close-invoices` às 03:00 UTC diariamente, `generate-recurrences` às 04:00 UTC diariamente.
5. **CI atualizado:** job `e2e` condicional (`if: ${{ vars.TEST_EMAIL != '' }}`), executa após CI principal, instala browsers Playwright, usa secrets do GitHub Actions.
6. **pnpm-workspace.yaml:** `allowBuilds` atualizado para aprovar `@sentry/cli` (necessário para o postinstall do pacote).
7. **Build final validado:** 31 rotas, `tsc --noEmit` OK, `eslint` 0 erros (3 warnings RC de RHF watch() — existiam antes, inofensivos), `vitest` 28/28, `next build` OK.

### 2026-07-01 — Fase 5 (Passivos, Metas & Busca): empréstimos, metas financeiras, busca global

1. **3 migrations aplicadas:** `20260701150000_loans.sql` (tabelas `loans` + `loan_installments`, RLS, RPCs `criar_emprestimo` + `pagar_parcela_emprestimo`), `20260701150100_goals.sql` (tabelas `goals` + `goal_allocations`, RLS, RPC `alocar_recurso_na_meta`), `20260701150200_search_indexes.sql` (pg_trgm + 4 índices de busca).
2. **Empréstimos (Tabela Price):** `calcLoanInstallments(principal, monthlyRatePct, count, firstDueDate)` em TypeScript puro — cliente calcula, RPC `criar_emprestimo` insere atomicamente (mesmo padrão de `registrar_compra_cartao`). `pagar_parcela_emprestimo` é SECURITY INVOKER, cria despesa na conta + marca parcela como Paga + quita o empréstimo automaticamente quando todas as parcelas estão pagas.
3. **Metas:** `current_amount` é sempre SUM de `goal_allocations` (SSoT — nunca coluna). `alocar_recurso_na_meta` opcionalmente debita uma conta (cria Transaction) ou apenas registra progresso manual. `GoalCompleted` disparado internamente na RPC quando current >= target.
4. **Busca global (`GET /api/search?q=`):** ILIKE em 4 tabelas (transactions.description, accounts.name, goals.name, loans.name) com RLS via Supabase client. Limite de 5 resultados por tipo. SearchBar com debounce de 300ms e dropdown de resultados agrupados por tipo no header.
5. **Feature `loans`** em `src/features/loans/{domain,api,hooks,components}`. **Goals** adicionadas à feature `planning` existente. **Search** como nova feature `src/features/search`.
6. **Header** atualizado: Dashboard | Contas | Cartões | Planejamento | Metas | Empréstimos + SearchBar inline.
7. **Pegadinha de tipo:** `p_default_account_id uuid` sem DEFAULT SQL → gerador cria tipo `string` (não nullable). Contornado com `as string` no call site do Route Handler. Para evitar no futuro: sempre adicionar `DEFAULT NULL` em parâmetros uuid opcionais de funções SQL.
8. **Build validado:** 28 rotas, `tsc --noEmit` OK, `eslint` 0 erros (3 warnings de React Compiler compat com watch() do RHF — existiam desde Fase 4, não afetam runtime), `vitest` 28/28, `next build` OK.

### 2026-07-01 — Fase 4 (Planning & Recorrências): orçamentos por categoria + regras de recorrência

1. **2 migrations aplicadas ao cloud:** `20260701140000_planning_budgets.sql` (tabela `budgets` + função `get_budgets_with_usage`) e `20260701140100_planning_recurrences.sql` (tabela `recurrence_rules`, colunas `recurrence_rule_id`/`recurrence_date` em `transactions`, índice de idempotência, função `generate_recurrences()` SECURITY DEFINER). Migration complementar `20260701140200_planning_defaults.sql` (`DEFAULT auth.uid()` nos dois novos tabelas) também aplicada — corrigiu erro de tipo `user_id required in Insert` no `tsc`.
2. **Problema técnico relevante — índice funcional em `timestamptz` não é IMMUTABLE:** primeira tentativa usava `CREATE UNIQUE INDEX ON transactions(recurrence_rule_id, (occurred_at::date))`. PostgreSQL rejeitou com "functions in index expression must be marked IMMUTABLE" porque `timestamptz::date` depende do GUC `TimeZone` da sessão. Solução: coluna simples `recurrence_date date` adicionada à tabela, usada no índice sem expressão. **Padrão para futuros índices únicos envolvendo datas derivadas de timestamptz: sempre criar uma coluna `date` dedicada.**
3. **`generate_recurrences()` SECURITY DEFINER:** usa `SELECT FOR UPDATE SKIP LOCKED` para evitar corrida entre execuções paralelas do cron + `ON CONFLICT DO NOTHING` no insert como segunda camada de idempotência. Avança `next_occurrence_date` após cada insert; soft-deletes a regra quando `v_next_date > end_date`.
4. **Função `get_budgets_with_usage(p_start, p_end_exclusive, p_timezone)`:** agrega gastos por categoria no intervalo do mês financeiro com `(occurred_at AT TIME ZONE p_timezone)::date` (mesmo padrão das funções do Dashboard). Filtra `b.reference_month = p_start` para mostrar só o mês corrente.
5. **Feature `planning`** criada em `src/features/planning`: schemas Zod (`createBudgetSchema`, `createRecurrenceSchema`), API layer (`fetchBudgetsWithUsage`, `createBudget`, `deleteBudget`, `fetchRecurrenceRules`, `createRecurrenceRule`, `deleteRecurrenceRule`), hooks (`useFinancialMonthRange` — usa `resolveFinancialMonth` + `toDateInTimezone` — SSoT compartilhado com Dashboard; `useBudgets`, `useCreateBudget`, `useDeleteBudget`, `useRecurrenceRules`, `useCreateRecurrenceRule`, `useDeleteRecurrenceRule`).
6. **Componentes:** `BudgetList` (barras de progresso, verde <80% / amarelo 80-99% / vermelho ≥100%), `BudgetForm` (dropdown de categorias do tipo "despesa", referenceMonth calculado automaticamente do mês financeiro do usuário), `RecurrenceList` (lista com frequência, próxima data, conta), `RecurrenceForm` (auto-preenche moeda ao selecionar conta via `useEffect`, Controller pattern do RHF para todos os Selects do Base UI).
7. **Pegadinha de tipo Base UI Select:** `onValueChange` tem tipo `(value: T | null) => void` (não apenas `T`) — requer `if (v !== null)` antes de chamar `setValue` do RHF. Aplicado em `budget-form.tsx`. Para os `Controller` renders a tipagem é resolvida pelo `field.onChange` do RHF diretamente.
8. **Páginas:** `/planejamento` (lista de orçamentos + formulário inline) e `/planejamento/recorrencias` (lista de regras + formulário inline). Nav do header atualizado: Dashboard | Contas | Cartões | Planejamento.
9. **`GET /api/cron/generate-recurrences`** Route Handler criado, protegido por `Authorization: Bearer <CRON_SECRET>`.
10. **`database.types.ts` regenerado** após todas as migrations. Build validado: **22 rotas**, `tsc --noEmit` OK, `eslint` OK, `vitest` 28/28, `next build` OK.

### 2026-07-01 — Fase 3 (Dashboard & PWA): dashboard principal, patrimônio por moeda, mês financeiro

1. **Migration `20260701130000_dashboard_functions.sql`** aplicada ao cloud: 3 DB functions (`get_balances_by_currency`, `get_category_expenses`, `get_month_expenses_total`) + 2 índices de performance (`idx_transactions_user_occurred_type`, `idx_transactions_account_active`). As funções de categoria e total usam `(occurred_at AT TIME ZONE p_timezone)::date` para comparação correta no timezone do usuário (não em UTC).
2. **`resolveFinancialMonth(date, startDay)` em `src/shared/domain/financial-month.ts`** (função pura, SSoT para Fase 4 também): calcula o intervalo [start, endExclusive) do mês financeiro atual do usuário. Clamp do `startDay` para evitar overflow em fevereiro. **9 testes Vitest** cobrindo casos de borda (virada de ano, fevereiro, dia exato de início, startDay > 28). Total de testes: **28 passando** (4 money + 15 invoice-resolver + 9 financial-month).
3. **`toDateInTimezone` movido para `src/shared/lib/timezone.ts`** — era duplicado em `credit-cards/api`. Agora importado de lá por ambos `credit-cards.ts` e o Route Handler do dashboard.
4. **`GET /api/dashboard/summary`** Route Handler: resolve o mês financeiro no timezone do usuário, executa 4 queries em paralelo (`Promise.all`), retorna `{ balancesByCurrency, monthExpenses, topCategories, recentTransactions, periodStart, periodEnd }`.
5. **Feature `dashboard`** criada em `src/features/dashboard`: `api/dashboard.ts` (tipo `DashboardSummary` + `fetchDashboardSummary`), `hooks/use-dashboard.ts` (`useDashboardSummary`, `staleTime: 60_000`), componentes: `BalanceCard` (card por moeda, BTC formatado com `.toFixed(8)`), `CategoryBars` (barras CSS puras, sem dependência de lib de gráficos — mais leve para mobile), `RecentTransactions`, `DashboardView`.
6. **`/` (home) substituída pelo Dashboard** — nova rota `/contas` criada para a lista de contas. Navegação do header: Dashboard | Contas | Cartões.
7. **Invalidação de cache adicionada** nas mutations existentes: `useCreateTransaction`, `useTransfer`, `useRegisterPurchase`, `usePayInvoice` agora invalidam `["dashboard-summary"]` no `onSuccess` — garante que o dashboard reflita mudanças sem precisar recarregar a página.
8. **`database.types.ts` regenerado** com as 3 novas funções SQL — RPCs tipadas automaticamente pelo gerador.
9. **Build validado**: 20 rotas, `tsc --noEmit` OK, `eslint` OK, `vitest` 28/28, `next build` OK.
10. **Decisão de gráfico**: Usado barras CSS puras em vez de recharts para evitar ~200KB de bundle extra em um PWA mobile-first. Revisitar se o usuário quiser mais riqueza visual (recharts, chart.js, etc.) — não é uma decisão fechada.

### 2026-07-01 — Fase 2 (Credit Management): cartões, faturas, parcelamentos, pagamento

1. **3 migrations aplicadas** ao projeto cloud (`xtyrsoeyreicinlvycwk`): (a) tabelas `credit_cards` e `invoices` (com constraint `unique(credit_card_id, reference_month)`) + FK em `transactions.invoice_id` (estava sem FK desde Fase 1, conforme anotado na migration) + coluna `transactions.purchase_group_id` para agrupar parcelas; (b) 4 DB functions: `get_invoice_total()`, `get_card_available_limit()` (limite = credit_limit − SUM de faturas Abertas/Fechadas, Single Source of Truth), `get_or_create_invoice()` (upsert atômico), `registrar_compra_cartao()` (recebe JSONB array de parcelas pré-calculadas pelo TS, insere atomicamente), `pagar_fatura()` (valida propriedade + debita na conta + atualiza transações da fatura + muda status para Paga); (c) função SECURITY DEFINER `close_due_invoices()` chamada pelo cron.
2. **Lógica de fatura como domínio puro TypeScript** (`src/features/credit-cards/domain/invoice-resolver.ts`): `resolveInvoiceMonth()` (Risco 2 / Seção 24: resolve o dia de fechamento no timezone do usuário, não em UTC — usa o dia LOCAL da compra comparado ao `closingDay`), `resolveClosingDate()`, `resolveDueDate()`, `buildInstallments()` (distribui centavos sem perda: `remainder` vai para a 1ª parcela). **15 testes Vitest** cobrindo todos os casos de borda exigidos pela Fase 2 (virada de ano, fevereiro, compra exatamente no dia de fechamento, soma ao centavo, erro em entrada inválida).
3. **Route Handlers**: `POST /api/credit-cards/pay-invoice` (chama RPC `pagar_fatura`), `POST /api/cron/close-invoices` (protegido por `CRON_SECRET` header, chama `close_due_invoices`). **Pendência de configuração**: `CRON_SECRET` deve ser adicionado ao `.env.local` e às env vars da Vercel; `vercel.json` com `crons` a adicionar quando a Vercel for conectada.
4. **UI**: nav "Cartões" no header, `/cartoes` (lista com limite disponível), `/cartoes/novo` (criar cartão), `/cartoes/[id]` (detalhe: limite + lista de faturas com `InvoiceDetail` — mostra transações da fatura + botão "Pagar" com seleção de conta para faturas Fechadas/Vencidas), `/cartoes/[id]/compra` (formulário de compra com suporte a parcelamento 1–48x, lê o timezone do usuário via `useUserSettings()`).
5. **`useUserSettings()` hook** criado em `src/features/identity/hooks/` — consulta `user_settings` via Supabase client.
6. **Problema ambiental registrado**: pnpm intermitentemente falha com "UNKNOWN: unknown error, read" ao tentar ler `node_modules/.pnpm-workspace-state-v1.json` ou `node_modules/.modules.yaml`. Causa provável: OneDrive sincronizando `node_modules` em real-time e gerando conflito de leitura. Não é um bug de código — o build completo rodado em background confirmou tsc/eslint/vitest/next build todos OK (17 rotas geradas). Workaround se recorrer: deletar `node_modules/.pnpm-workspace-state-v1.json` e rodar `pnpm install`.

### 2026-06-30 — Fase 1 (Core Ledger): contas, categorias, transações, transferências

Continuação da mesma sessão que fechou a Fase 0 (ver entrada abaixo). Resumo na ordem em que aconteceu:

1. **Migration `20260630181532_core_ledger.sql`:** tabelas `accounts`, `categories`, `transactions` (com `chk_account_or_invoice`, `invoice_id` ainda sem FK — chega na Fase 2), `transfers` (tabela de ligação leve, sem soft delete/colunas de auditoria completas, igual ao desenho original do `FASE_01_CORE_LEDGER.md`) — todas com RLS (`select_own_not_deleted`/`insert_own`/`update_own`) e trigger de auditoria (exceto `transfers`, que não tem as colunas para isso). Completado o item deixado pendente na Fase 0: `handle_new_user()` agora também copia `system_categories` → `categories` do novo usuário. Criadas 3 funções: `get_account_balance()` (SUM on-the-fly, nunca coluna — Seção 29), `create_account_with_initial_balance()` (RPC atômica: cria a conta + a Transaction de sistema "Saldo Inicial" se o valor for != 0) e `efetivar_transferencia()` (RPC atômica: valida mesma moeda entre as 2 contas, cria as 2 pernas da transferência + o registro em `transfers`, tudo em uma única chamada de função = uma transação Postgres implícita).
2. **Decisão registrada:** transferências usam `type = 'transferencia'` (não `despesa`/`receita`) e `category_id = null` — diverge da prosa do `FASE_01_CORE_LEDGER.md` (que dizia "despesa"/"receita" para as duas pernas), mas segue o `CHECK` constraint do schema (que já previa esse terceiro valor) e evita que transferências entre contas próprias poluam relatórios/orçamentos de receita-despesa nas Fases 4+. **Atenção na Fase 4 (Orçamentos):** o cálculo de orçamento deve filtrar `type != 'transferencia'`.
3. **Migration aplicada direto pelo agente** (usuário autorizou nesta sessão a pular a confirmação manual a cada `db push`, depois que o auto mode bloqueou um `yes y |` sem mostrar preview — usado o flag oficial `--yes` do CLI em vez disso). `database.types.ts` regenerado.
4. **Bug de tipos pego no `tsc`, corrigido com 2ª migration (`20260630183330_core_ledger_defaults.sql`):** `user_id` ganhou `default auth.uid()` em `accounts/categories/transactions/transfers` (sem isso, o tipo `Insert` gerado exigia passar `user_id` manualmente em todo insert direto, apesar do trigger `set_audit_fields()` já preencher via `coalesce`); parâmetros opcionais das funções RPC (`p_icon`, `p_color`, `p_description`, `p_initial_balance`, `p_occurred_at`) ganharam `DEFAULT` para virar `?:` opcional no TS gerado em vez de exigir `null` explícito (que o gerador não tipa como aceito).
5. **Value Objects:** `Money` (`add`/`subtract`, lança erro em moedas diferentes) e `TransactionStatus` em `src/shared/domain`, com testes unitários (Vitest, configurado nesta sessão pela primeira vez — `vitest.config.ts` com `resolve.tsconfigPaths: true` nativo, sem precisar do plugin `vite-tsconfig-paths`). 4 testes passando. Adicionado `pnpm test` ao `package.json` e ao `.github/workflows/ci.yml` (entre `typecheck` e `build`).
6. **TanStack QueryClientProvider** configurado pela primeira vez na raiz (`src/shared/providers/query-provider.tsx`) — estava instalado desde a Fase 0 mas nunca tinha sido conectado.
7. **Camada de API + hooks:** `src/features/accounts/{api,hooks,domain}` e `src/features/transactions/{api,hooks,domain}`. Lançamento de despesa/receita é insert direto (Seção 18/Fase 1 item 5.4 — sem Route Handler dedicada); transferência passa pela única Route Handler transacional desta fase (`POST /api/transactions/transfer`, Zod + chama a RPC `efetivar_transferencia`). Invalidação de cache do TanStack Query nos `onSuccess` das mutations faz o papel de "listener" de evento de domínio mínimo pedido no item 7 da fase (sem fila/broker real, como o plano já antecipava).
8. **UI:** criado grupo de rotas `src/app/(app)` com header compartilhado (nome do app + botão Sair) — o antigo `src/app/page.tsx` (placeholder "Logado como X") foi substituído pela lista de contas de verdade. Páginas: `/` (lista de contas com saldo), `/contas/nova`, `/contas/[id]` (detalhe + extrato), `/transacoes/nova` (aceita `?accountId=` via `searchParams` da própria page, sem precisar de `useSearchParams`/Suspense), `/transferencias/nova`. Adicionados componentes shadcn `select` (faltava). **Detalhe técnico:** o `Select` do `@base-ui/react` não tem `asChild` (isso é Radix) — usa prop `render`; para botões que navegam (Link), optei por aplicar `buttonVariants()` direto na `className` do `<Link>` em vez de tentar a API de polimorfismo do Base UI, mais simples e previsível.
9. **Pegadinha de tipos zod v4 + react-hook-form:** `z.coerce.number()` (usado em `amount`/`initialBalance`) quebra a inferência de tipo do `zodResolver` quando `useForm<T>()` é tipado só com o tipo de saída do schema. Corrigido em todo formulário com coerce: `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>(...)` (padrão de 3 genéricos do RHF pra schemas com transform/coerce). **Padrão a repetir em qualquer formulário futuro que use `z.coerce`.**
   10b. **Bug `SelectValue` mostrando UUID em vez do label (corrigido imediatamente após o usuário testar):** o `Select.Value` do `@base-ui/react/select` usa lookup interno de label pelo `ItemText` dos itens — mas esse lookup falha quando os itens estão num portal e o dropdown está fechado (não estão montados no DOM). Resultado: o trigger exibia o `value` raw (UUID) em vez do nome. **Solução padrão para todos os selects com dados dinâmicos:** passar o label computado explicitamente como children do `SelectValue` dentro do `Controller.render`: `<SelectValue placeholder="...">{ accounts?.find(a => a.id === field.value)?.name }</SelectValue>`. Aplicado em todos os Selects de dados dinâmicos nos formulários afetados (`transaction-form.tsx`, `transfer-form.tsx`). Selects com valores estáticos curtos onde value === display (ex: moeda "BRL"/"USD"/"BTC") não precisam do workaround — funcionam normalmente.
10. **Troca de `watch()` por `useWatch()`** em `transaction-form.tsx` depois do ESLint (React Compiler do Next 16) avisar que `watch()` não é seguro de memoizar — `useWatch` é a alternativa recomendada pela própria react-hook-form para esse caso.
11. Tudo validado ao final: `tsc --noEmit`, `eslint .`, `pnpm test` (4/4) e `next build` (13 rotas, incluindo as novas) — todos limpos.
12. **Não verificado nesta sessão (pendente):** fluxo completo na UI real de um navegador (criar conta → ver saldo → lançar despesa/receita → ver saldo atualizado → transferência entre 2 contas → ver as duas pontas no extrato). O agente não tem como criar um usuário confirmado sem acesso a e-mail/navegador real — pedido ao usuário para testar manualmente (próxima entrada, se/quando isso acontecer).

### 2026-06-30 — Auditoria do estado real + retomada da Fase 0

- Sessão começou com discrepância: este arquivo dizia "nenhum código escrito" (entrada de 2026-06-26), mas o repositório (ainda sem nenhum commit, branch `master`) já tinha trabalho de uma sessão anterior de 4 dias atrás. Auditoria do disco confirmou o que existe de fato (detalhe abaixo) antes de continuar, para não duplicar nem perder trabalho.
- **O que já existia ao iniciar esta sessão (Fase 0, passo 1 — Setup do repositório):**
  - Projeto Next.js criado (`pnpm create next-app`) com TypeScript, Tailwind, App Router, ESLint — App Router ainda no template padrão (`src/app/page.tsx`/`layout.tsx` não customizados).
  - shadcn/ui inicializado (`components.json`, `src/shared/ui/button.tsx`), TanStack Query, Zod, React Hook Form e `@hookform/resolvers` instalados via `package.json`.
  - Husky + lint-staged + Prettier configurados (`.husky/pre-commit`, `.prettierrc.json`, `.prettierignore`, bloco `lint-staged` no `package.json`).
  - Estrutura de pastas Feature First **já estava criada** (correção: uma primeira verificação rápida nesta sessão via `find -type f` levou à conclusão errada de que `src/features/*` não existia — arquivos vazios não aparecem nesse comando. Uma checagem por diretório confirmou que `src/features/{identity,accounts,transactions,credit-cards,planning,loans,dashboard}/{api,components,domain,hooks}` e `src/shared/{domain,hooks}` já existiam, vazios, de uma sessão anterior). Único ajuste feito nesta sessão: adicionado `.gitkeep` nas pastas de feature de nível superior para que apareçam no Git mesmo vazias (subpastas internas `api/components/domain/hooks` continuam sem `.gitkeep` — sem necessidade até terem conteúdo).
- **O que já existia (Fase 0, passo 2/3/4 — Supabase, schema, RLS):**
  - `supabase init` executado (`supabase/config.toml`), CLI instalado como devDependency.
  - Migration `supabase/migrations/20260626150004_initial_foundation.sql` já escrita e versionada, contendo: função `uuid_generate_v7()` (PL/pgSQL portátil, sem depender de extensão externa), trigger genérica `set_audit_fields()` + `touch_updated_at()`, tabela `user_settings` (1:1 com `auth.users`, RLS habilitado com policies de select/update próprias, sem policy de insert — só o trigger de onboarding insere), tabela `system_categories` (catálogo global seedado com 14 categorias padrão, RLS de select para `authenticated`, sem insert/update/delete via API) e trigger `handle_new_user()` que popula `user_settings` no signup (a cópia de `system_categories` para a tabela `categories` do usuário foi conscientemente deixada para a migration da Fase 1, quando essa tabela passar a existir).
  - **Ainda não existia:** `.env.local`/`.env.example`, stack local rodando (nunca testado, Docker não estava ativo), teste manual de RLS com 2 usuários, `database.types.ts` gerado.
- **O que já existia (Fase 0, passos 5-8 — Soft delete, CI, Auth, PWA):** nada ainda. Sem helper de soft delete, sem GitHub Actions (`.github/` não existe), sem páginas de login/cadastro/recuperação, sem `middleware.ts`, sem manifest/service worker de PWA.
- **Ação desta sessão:** corrigida a entrada "Contexto Atual" acima (estava desatualizada) e retomada a execução da Fase 0 a partir do que faltava. Detalhe do que foi feito a partir daqui nas entradas seguintes (mais recentes, acima desta quando adicionadas).
- **Observação para sessões futuras:** o repositório ainda não tem nenhum commit (`git log` vazio). Nenhum commit foi criado nesta sessão sem solicitação explícita do usuário, conforme protocolo de segurança do agente — combinar com o usuário quando fizer sentido criar o primeiro commit.
- **Progresso feito nesta sessão, na ordem em que aconteceu:**
  1. Adicionado `.gitkeep` nas pastas de feature de nível superior (`src/features/*`) para que apareçam no Git mesmo vazias.
  2. Criado `.env.example` (committed, sem valores reais).
  3. Usuário informou ter um projeto Supabase **cloud** (não local) — `xtyrsoeyreicinlvycwk`. Durante a coleta de credenciais, o usuário colou por engano a **connection string do Postgres com a senha do banco** no chat; o agente recusou gravar essa senha em qualquer arquivo e recomendou ao usuário resetá-la em Project Settings → Database. Em seguida, coletados os valores corretos e seguros para client-side (Project URL + chave "Publishable" — equivalente atual da antiga "anon key" no novo formato de chaves do Supabase) e criado `.env.local` (gitignored) com eles. `SUPABASE_SERVICE_ROLE_KEY` deixado em branco — só será necessário a partir de Route Handlers transacionais (Fase 1+).
  4. Detectado que `src/shared/supabase/client.ts` (de sessão anterior) já importava `@/shared/supabase/database.types`, mas esse arquivo nunca existia — `tsc --noEmit` falhava. Criado `src/shared/supabase/database.types.ts` como placeholder tipado (`Database` com todas as seções vazias), com nota para regenerar via `supabase gen types typescript --linked` assim que a migration for aplicada no projeto cloud.
  5. Como o Docker não estava ativo e o link/push ao projeto cloud exige login interativo do usuário, a aplicação da migration **ficou pendente do próprio usuário** rodar `supabase login && supabase link --project-ref xtyrsoeyreicinlvycwk && supabase db push` no terminal dele — o agente não tem como fazer login interativo nem deveria manipular o schema de produção sem esse passo explícito do usuário.
  6. Criado `src/shared/supabase/server.ts` (client factory para Server Components/Route Handlers, padrão `@supabase/ssr`).
  7. Criado `src/shared/supabase/soft-delete.ts` (helper único e obrigatório para exclusão lógica — nunca `.delete()`).
  8. Adicionados componentes shadcn/ui `input`, `label`, `card` (faltavam — só `button` existia).
  9. Implementada a feature `identity` completa: schemas Zod (`src/features/identity/domain/schemas.ts`), formulários de login/cadastro/recuperação de senha/atualização de senha e botão de logout (`src/features/identity/components/*`), páginas em `src/app/(auth)/{login,cadastro,recuperar-senha,atualizar-senha}`, rota de callback OAuth/recovery (`src/app/auth/callback/route.ts`), e página raiz (`src/app/page.tsx`) atualizada para mostrar o usuário logado + logout (estava no template padrão do `create-next-app`).
  10. Criado o "proxy" (middleware) de proteção de rotas (`src/shared/supabase/middleware.ts` + `src/proxy.ts`). **Nota importante:** Next.js 16.2.9 depreciou o arquivo `middleware.ts` em favor de `proxy.ts` (export `proxy`, não mais `middleware`) — usado o novo padrão direto, evitando o warning de depreciação.
  11. `layout.tsx` raiz atualizado: `lang="pt-BR"` (estava `en`, herdado do template), metadata com nome real do app e `manifest.json` referenciado (preparação para o passo de PWA).
  12. Validado em cada etapa relevante com `tsc --noEmit`, `eslint .` e `next build` — todos passando limpos ao final desta lista.
  13. PWA shell (Fase 0, passo 8): gerados ícones placeholder (192/512/apple-touch, fundo neutro `#0F172A` com "F" — **sem identidade visual real ainda, é só infraestrutura**; trocar quando houver design), criado `public/manifest.json` e `public/sw.js`. **Decisão técnica:** tentada a lib `@serwist/next` (sucessora ativa do `next-pwa`), mas seu modo de integração padrão (`withSerwist`, baseado em webpack) avisa explicitamente que não suporta Turbopack — e este projeto usa Turbopack (visível no output do `next build`). O modo alternativo com suporte a Turbopack está marcado como experimental pela própria lib. Para não acoplar a fundação do projeto a uma integração experimental, a dependência foi removida e um Service Worker mínimo foi escrito à mão (`public/sw.js`, cache-first só para `/_next/static/*` e ícones/manifest — exatamente o escopo do passo 8.1, que adia cache de dados para a Fase 3). Registrado o SW via `src/shared/pwa/service-worker-register.tsx` (só roda em produção). Revisitar essa escolha na Fase 3, quando a estratégia stale-while-revalidate de dados (Seção 25) for implementada — nesse ponto vale reavaliar se o suporte a Turbopack das libs de PWA já amadureceu.
  14. CI (Fase 0, passo 6): criado `.github/workflows/ci.yml` (lint → typecheck → build em PR/push para `main`). Confirmado (testando localmente com `.env.local` temporariamente renomeado e restaurado em seguida) que o build não depende de variáveis de ambiente do Supabase — o client só é instanciado em tempo de execução, não no topo do módulo — então o workflow não precisa de secrets/vars para passar. Adicionado `"packageManager": "pnpm@11.9.0"` ao `package.json` para fixar a versão do pnpm usada pelo `pnpm/action-setup` no CI.
  15. Ainda faltam do passo 6: conectar o repositório à Vercel (Preview Deployments) — depende do usuário ter/criar uma conta Vercel e importar o repo, não algo que o agente faz sozinho.
  16. Usuário rodou `supabase login && supabase link && supabase db push` no terminal dele. Duas falhas encontradas e corrigidas nesse processo:
      - **`gen_random_bytes(integer) does not exist`** ao inserir as `system_categories` (o `DEFAULT` da coluna `id` chama `uuid_generate_v7()`, que chamava `gen_random_bytes()` sem qualificar schema). Causa: Supabase instala `pgcrypto` no schema `extensions` por padrão em projetos novos, não em `public`, e o `create extension if not exists pgcrypto;` (sem `with schema`) só pulou silenciosamente por já existir lá — então a função nunca resolvia `gen_random_bytes` sem qualificação. Corrigido na migration: `create extension if not exists pgcrypto with schema extensions;` + chamada `extensions.gen_random_bytes(10)` explícita. **Isso é uma pegadinha real de qualquer projeto Supabase cloud novo — vale lembrar em qualquer migration futura que crie/use extensões.**
      - **`AlreadyExists: FileSystem.makeDirectory ... supabase\.temp`** ao repetir `supabase link` depois de já ter linkado uma vez (diretório de cache local do CLI já existia). Resolvido simplesmente não repetindo `login`/`link` nas tentativas seguintes — bastava `supabase db push` sozinho, já autenticado/linkado.
  17. `db push` (com a migration corrigida) aplicado com sucesso no projeto cloud `xtyrsoeyreicinlvycwk`. `database.types.ts` regenerado de verdade via `supabase gen types typescript --linked` (substituindo o placeholder do item 4 acima) — confirma `user_settings` e `system_categories` existindo no banco com o schema esperado. `tsc --noEmit`, `eslint .` e `next build` validados de novo, tudo limpo.
  18. **Teste manual de RLS (Fase 0, critério 4.4) — concluído pelo usuário no SQL Editor do Supabase**, seguindo runbook passado pelo agente: criados 2 usuários de teste confirmados (`rls-test-a@example.com`, `rls-test-b@example.com`) via dashboard, confirmado que ambos já tinham `user_settings` populado automaticamente (valida o trigger de onboarding `handle_new_user()` funcionando — o dashboard "Add user" dispara o mesmo trigger `AFTER INSERT on auth.users` que um signup real pela UI), depois simulada a sessão de cada um via `set_config('request.jwt.claims', ...) + set local role authenticated` dentro de uma transação com `rollback` no final — usuário confirmou que cada um só via/editava a própria linha. Usuário reportou sucesso ("funcionou"). Usuários de teste devem ser apagados pelo usuário em Authentication → Users (passo de limpeza do runbook).
  19. **Bug encontrado pelo usuário ao testar a UI manualmente:** ao preencher e-mail/senha em `/login` e clicar "Entrar", o navegador fez um submit HTML **nativo** (GET), vazando a senha em texto puro na URL (`/login?email=...&password=...`). Investigado com o agente rodando a app via Playwright headless (instalado temporariamente só para diagnóstico, removido depois — não ficou como dependência do projeto). **Causa raiz confirmada por reprodução determinística (2/2, depois 5/5):** corrida de hidratação do React em modo dev — o Next.js/Turbopack compila cada rota sob demanda na primeira visita, e se o usuário preenche e clica antes do JS do client component terminar de hidratar (mais provável em LAN/mobile, como no caso do usuário acessando via `10.8.0.5:3000`), o `<form>` ainda não tem o `onSubmit` do React anexado e o navegador faz o submit nativo dele mesmo — que por padrão é `method="GET"`, jogando todos os campos (incluindo senha) na query string. **Correção aplicada:** adicionado `method="post"` explícito nos 4 formulários de Auth (`login-form.tsx`, `signup-form.tsx`, `request-password-reset-form.tsx`, `update-password-form.tsx`). Isso não elimina a corrida em si (o `onSubmit` do React continua sendo o caminho normal e sempre intercepta quando a hidratação já aconteceu), mas garante que **mesmo no cenário de corrida**, um eventual submit nativo usa POST — sem nenhum dado sensível na URL/histórico/logs de servidor. Validado: 5/5 tentativas simulando a mesma corrida (clique imediatamente após `domcontentloaded`, sem esperar hidratação) não vazaram mais nada na URL. **Padrão a repetir em qualquer formulário futuro que colete dados sensíveis** (ex: troca de senha, dados de cartão): sempre declarar `method="post"` no `<form>`, mesmo quando o submit real é 100% via JS/`onSubmit`.
  20. ⚠️ **Nota de segurança não resolvida:** a senha de teste usada pelo usuário no passo acima (`Senha984746@`) é a mesma já exposta nesta conversa na connection string do Postgres (ver item 3). Ela agora também ficou no histórico do navegador do usuário (antes da correção). O agente recomendou novamente trocar essa senha — ainda pendente de confirmação do usuário.
  21. **Usuário retestou a UI após a correção do item 19 — fluxo completo de Auth validado de ponta a ponta num navegador real:** cadastro → confirmação de e-mail → login → redirecionamento para `/` mostrando "Logado como `cairomaranzatto.jau@gmail.com`" + botão "Sair". **Fase 0 considerada fechada** para fins de desenvolvimento — os únicos itens restantes (1º commit/push pro GitHub pra CI rodar remotamente, conexão com Vercel) continuam dependendo de ação do usuário fora deste chat e não bloqueiam o início da Fase 1.

### 2026-06-26 — Refinamento do planejamento macro + criação das fases + criação deste Memory Bank

- Revisado o planejamento macro original e identificadas lacunas/contradições (ver Log de Decisões abaixo para detalhe de cada uma).
- Adicionadas as Seções 25-31 ao `PLANEJAMENTO_SISTEMA_FINANCEIRO.md` (Stack Tecnológico, Estratégia de Testes, CI/CD e Observabilidade, Modelo de Identidade e Categorias Padrão, Regras de Negócio Complementares, Definition of Done do MVP, Lacunas adiadas para V2).
- Criada a pasta `fases/` com 7 arquivos de execução (`FASE_00` a `FASE_06`) + `INDICE.md`, cobrindo do setup técnico até o hardening de lançamento.
- Criados `AGENTS.md` (referência estrutural rápida) e este `MEMORY_BANK.md`.
- **Estado ao final desta sessão:** projeto 100% em planejamento, zero código. Pronto para iniciar a Fase 0 na próxima sessão.

---

## Progresso por Fase

_(Atualize o status conforme o trabalho avança. Status possíveis: `Não iniciada` · `Em andamento` · `Concluída` · `Bloqueada`.)_

| Fase                             | Status       | Última atualização | Observações                                                                                                                                                                                            |
| -------------------------------- | ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fase 0 — Fundação                | ✅ Concluída | 2026-06-30         | Migration aplicada no cloud, tipos gerados, RLS testado, Auth validado no navegador (bug de vazamento de senha na URL corrigido).                                                                      |
| Fase 1 — Core Ledger             | ✅ Concluída | 2026-07-01         | Validado na UI real. Bugs corrigidos: backfill categories, SelectValue label, Select uncontrolled warning.                                                                                             |
| Fase 2 — Cartões de Crédito      | ✅ Concluída | 2026-07-01         | Validado na UI real (cartão + compra + fatura).                                                                                                                                                        |
| Fase 3 — Dashboard & PWA         | ✅ Concluída | 2026-07-02         | Dashboard com patrimônio por moeda, gastos do mês, top categorias. Validado em produção.                                                                                                               |
| Fase 4 — Planning & Recorrências | ✅ Concluída | 2026-07-02         | Orçamentos com barra de progresso, recorrências automáticas via cron. Validado em produção.                                                                                                            |
| Fase 5 — Passivos, Metas & Busca | ✅ Concluída | 2026-07-02         | Empréstimos (Tabela Price), metas com aportes, busca global. Validado em produção.                                                                                                                     |
| Fase 6 — Hardening & Lançamento  | ✅ Concluída | 2026-07-02         | Sentry via `instrumentation.ts`, logger JSON, Playwright E2E (3 golden paths), CI com job e2e condicional, `vercel.json` com cron. Deploy em https://financeiro-virid-phi.vercel.app/ — **MVP ativo**. |

---

## Log de Decisões

_(Mais recente no topo. Cada entrada: decisão, data, motivo, e quem decidiu — usuário/PO ou decisão técnica padrão da arquitetura.)_

### 2026-06-30 — Transferências usam type='transferencia' (não despesa/receita), category_id nulo

- **Decisão:** as duas pernas de uma transferência entre contas próprias (`efetivar_transferencia()`) são gravadas com `transactions.type = 'transferencia'` e `category_id = null`, não como uma despesa/receita categorizada.
- **Motivo:** o `FASE_01_CORE_LEDGER.md` (prosa, item 5.2) descrevia as pernas como "despesa"/"receita", mas o próprio `CHECK` constraint do schema (`type in ('receita','despesa','transferencia')`, definido na Seção 14 do planejamento original) já previa um terceiro valor para exatamente esse caso. Usar `'transferencia'` é mais correto: transferências entre contas do mesmo usuário não são receita nem despesa "real" e não devem entrar em relatórios/orçamentos de receita-despesa.
- **Impacto futuro:** a Fase 4 (Orçamentos) precisa filtrar `type != 'transferencia'` no cálculo de gasto por categoria — não esquecer ao implementar `resolveFinancialMonth()`/cálculo de orçamento.
- **Decidido por:** decisão técnica padrão (Tech Lead), durante a implementação da Fase 1.

### 2026-06-26 — Backend transacional 100% em Next.js Route Handlers (não Supabase Edge Functions)

- **Decisão:** Toda lógica complexa/transacional (`transfer`, `pay-invoice`, crons) roda em Next.js Route Handlers na Vercel. Supabase Edge Functions não são usadas.
- **Motivo:** O planejamento original mencionava "Edge Functions (Serverless Vercel/Supabase)" de forma ambígua, como se fossem intercambiáveis. Manter um único runtime evita duplicar configuração de observabilidade/logs e reduz a superfície de deploy.
- **Decidido por:** decisão técnica padrão (Tech Lead), durante refinamento do planejamento.

### 2026-06-26 — UUIDv7 em vez de UUIDv4

- **Decisão:** Todas as PKs usam UUIDv7.
- **Motivo:** Ordenação temporal nativa melhora a localidade de índice B-tree no Postgres em relação ao v4, sem expor uma sequência previsível como um `serial`. O planejamento original deixava a escolha aberta ("UUIDv4 ou v7").
- **Decidido por:** decisão técnica padrão (Tech Lead), durante refinamento do planejamento.

### 2026-06-26 — Saldo inicial de conta é uma Transaction de sistema, não uma coluna

- **Decisão:** `accounts` não tem coluna de saldo. O "saldo inicial" informado na criação gera uma `Transaction` de sistema (categoria "Saldo Inicial", não editável/excluível pelo usuário).
- **Motivo:** O planejamento original dizia, ao mesmo tempo, que `accounts` "guarda saldo inicial" (Seção 14) e que o saldo é "100% calculado, nunca editável" (Seção 10) — uma contradição direta. A Transaction de sistema resolve sem abrir exceção à regra de saldo calculado.
- **Decidido por:** decisão técnica padrão (Tech Lead), durante refinamento do planejamento.

### 2026-06-26 — Patrimônio Líquido segregado por moeda, sem conversão cambial

- **Decisão:** O Dashboard exibe o Patrimônio Líquido em cards separados por moeda (BRL, USD, BTC), sem taxa de câmbio nem consolidação em um único número, no MVP.
- **Motivo:** RF07 ("Patrimônio Líquido em tempo real") conflitava com a regra "Won't Have: Conversão Cambial" do backlog — não havia forma definida de exibir um único número de patrimônio com contas em 3 moedas diferentes sem câmbio. Avaliadas 3 alternativas (converter para BRL na exibição / segregar por moeda / adiar para V2); o usuário escolheu segregar por moeda.
- **Decidido por:** usuário (Product Owner), em resposta direta a pergunta de esclarecimento.

### 2026-06-26 — Stack definitiva: Next.js + TypeScript + Tailwind + shadcn/ui

- **Decisão:** Frontend em Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui; dados via TanStack Query + Supabase Client direto (sem ORM); validação via Zod + React Hook Form; testes via Vitest + Playwright; pnpm como package manager.
- **Motivo:** O planejamento original implicava fortemente esse ecossistema (Vercel + Supabase + PWA + minimizar endpoints custosos) mas nunca fixava as bibliotecas explicitamente, o que deixaria toda instrução de fase ambígua. Apresentada como opção recomendada ao usuário junto de uma alternativa aberta ("tenho outra preferência"); usuário confirmou a recomendação.
- **Decidido por:** usuário (Product Owner), confirmando recomendação técnica.

---

## Problemas Conhecidos e Dívida Técnica

_(Mais recente no topo.)_

### 2026-06-30 — `database.types.ts` é um placeholder, não os tipos reais

`src/shared/supabase/database.types.ts` foi criado à mão como um `Database` vazio (todas as seções `Record<string, never>`) só para destravar o `tsc --noEmit`, que falhava porque `client.ts` (de sessão anterior) já importava esse caminho sem o arquivo existir. **Precisa ser substituído** por `pnpm exec supabase gen types typescript --linked > src/shared/supabase/database.types.ts` assim que a migration for aplicada no projeto cloud — enquanto isso, não há autocomplete/checagem de tipo reais nas queries Supabase.

### 2026-06-30 — Ícones do PWA são placeholder sem identidade visual

`public/icons/{icon-192,icon-512,apple-touch-icon}.png` foram gerados programaticamente (fundo `#0F172A` + letra "F") só para o manifest funcionar e o "Adicionar à tela inicial" ficar testável. Trocar por ícones reais quando houver identidade visual definida.

---

## Perguntas Abertas

_(Nenhuma pendente no momento. Itens conscientemente adiados para V2/V3 — não são perguntas abertas, são decisões de escopo já registradas na Seção 31 do planejamento macro: anexos/comprovantes, exportação LGPD, conversão cambial, Open Finance, rate limiting, sync offline de escrita.)_
