# AGENTS.md — Referência Estrutural Rápida

> Status do projeto: 🟢 **MVP em produção + Aprimoramento de Categorias implementado.** Todas as Fases 0–6 do MVP e todas as Fases A0–A6 de [fases/aprimoramento/](fases/aprimoramento/INDICE.md) (taxonomia hierárquica de categorias — 16 pais + 76 subcategorias) foram implementadas e aplicadas no banco de produção. **Atenção:** o código ainda não foi commitado/deployado na Vercel nesta sessão — ver `MEMORY_BANK.md` → Contexto Atual antes de assumir que o app publicado em https://financeiro-virid-phi.vercel.app/ já reflete o aprimoramento. Este arquivo existe para que qualquer pessoa (ou agente de IA) que assuma o desenvolvimento entenda a estrutura completa em poucos minutos, sem precisar ler as 31 seções do planejamento macro inteiro. Para o "porquê" de cada decisão, siga os links indicados.

## Antes de programar qualquer linha de código

1. Leia este arquivo até o fim (5-10 min).
2. Abra [fases/INDICE.md](fases/INDICE.md) para o histórico do MVP (concluído), e [fases/aprimoramento/INDICE.md](fases/aprimoramento/INDICE.md) para o trabalho em andamento (taxonomia de categorias).
3. Em caso de dúvida sobre uma regra de negócio, consulte primeiro a seção correspondente em [PLANEJAMENTO_SISTEMA_FINANCEIRO.md](PLANEJAMENTO_SISTEMA_FINANCEIRO.md) (MVP) ou [fases/CATEGORIAS_REFERENCIA.md](fases/CATEGORIAS_REFERENCIA.md) (taxonomia de categorias) antes de decidir por conta própria.
4. Ao concluir qualquer trabalho relevante (decisão, marco, bug crítico resolvido), registre em [MEMORY_BANK.md](MEMORY_BANK.md).

## Mapa de Documentação

| Arquivo                                  | Para quê serve                                                                                 | Quando consultar                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `AGENTS.md` (este)                       | Referência rápida e mapa geral                                                                 | Primeiro contato, ou para "lembrar rápido" algo             |
| `PLANEJAMENTO_SISTEMA_FINANCEIRO.md`     | Planejamento macro completo (DDD, requisitos, arquitetura, Seções 1-31)                        | Entender o "porquê" de uma decisão em profundidade          |
| `fases/INDICE.md` + `fases/FASE_0X_*.md` | Plano de execução passo a passo, na ordem de implementação                                     | Saber exatamente o que fazer agora e como                   |
| `MEMORY_BANK.md`                         | Histórico vivo: decisões tomadas durante a implementação, progresso real, problemas conhecidos | A cada sessão de trabalho — ler no início, atualizar no fim |

## O que é este projeto

Hub de inteligência financeira pessoal (PWA), com fundação pronta para evoluir a SaaS multiusuário e automações de IA. Visão completa: Seção 1 do planejamento macro.

## Stack Tecnológico (decisão fechada — Seção 25)

- **Frontend:** Next.js 14+ (App Router), TypeScript estrito, Tailwind CSS, shadcn/ui.
- **Dados/Estado:** TanStack Query + Supabase JS Client direto — **sem ORM** (nem Prisma, nem Drizzle).
- **Validação:** Zod (schema único, compartilhado entre formulário e backend) + React Hook Form.
- **Backend transacional:** Next.js Route Handlers (Vercel, runtime Node.js). **Nunca** Supabase Edge Functions — um único runtime, um único lugar de observabilidade.
- **Banco:** Supabase (PostgreSQL) com Row Level Security nativo.
- **Migrations:** Supabase CLI, SQL versionado no repositório.
- **Testes:** Vitest (unitário/domínio) + Playwright (E2E).
- **Package manager:** pnpm.
- **PWA:** Service Worker, estratégia _stale-while-revalidate_ para leitura.
- **IDs:** UUIDv7 em todas as PKs (não v4).

## Estrutura de Pastas (Feature First — Seção 17)

```
/src
  /features
    /identity        (Auth, Settings)
    /accounts        (Contas e saldos)
    /transactions    (Despesas, Receitas, Transferências)
    /credit-cards    (Cartões, Faturas, Parcelas)
    /planning        (Orçamentos, Metas)
    /loans           (Empréstimos)
    /dashboard       (Agregações, Gráficos)
  /shared
    /domain          (Value Objects: Money, DateRange, TransactionStatus, InvoiceStatus, CategoryType)
    /ui              (componentes shadcn/ui compartilhados)
    /supabase        (client factory, tipos gerados, helpers de soft delete)
/fases               (plano de execução por fase de desenvolvimento)
PLANEJAMENTO_SISTEMA_FINANCEIRO.md
AGENTS.md
MEMORY_BANK.md
```

Cada feature mantém `/api`, `/components`, `/domain`, `/hooks` internamente — nunca organizar por camada técnica global (`/models`, `/controllers`).

## Bounded Contexts (Seção 5)

1. **Identity & Access** — Autenticação, perfis, preferências.
2. **Core Ledger** — Contas, Transações, Transferências, Categorias. O coração financeiro.
3. **Credit Management** — Cartões, limites, faturas, parcelamentos.
4. **Liabilities** — Empréstimos e dívidas.
5. **Planning & Tracking** — Orçamentos e Metas Financeiras.
6. **Analytics & Wealth** — Patrimônio, Dashboard, relatórios.

## Modelo de Domínio — Referência Rápida (Seções 7-8)

- **Aggregate Roots:** `User`, `Account`, `Category`, `CreditCard`, `Goal`, `Budget`, `Loan`.
- **Entidades filhas:** `Transaction` (pertence a Account OU Invoice), `Invoice` (pertence a CreditCard), `Installment`/`LoanInstallment`.
- **Value Objects:** `Money` (amount + currency, nunca soma moedas diferentes), `DateRange`, `TransactionStatus` (Pendente/Pago/Vencido/Cancelado), `InvoiceStatus` (Aberta/Fechada/Paga/Vencida), `CategoryType` (Receita/Despesa/Ambas).

## Regras de Negócio que NUNCA devem ser violadas

- **Saldo de conta** = sempre soma _on-the-fly_ das transações pagas. Nunca uma coluna armazenada. (Seção 10/29)
- **"Saldo inicial"** de uma conta é uma `Transaction` de sistema (categoria "Saldo Inicial"), não uma coluna em `accounts`. (Seção 14)
- **Fechamento de fatura:** compra antes/no dia do fechamento → fatura atual; depois → próxima fatura. Resolver sempre no timezone do usuário, nunca em UTC puro. (Seção 10, Risco 2)
- **Patrimônio Líquido** é exibido **segregado por moeda** (cards BRL/USD/BTC separados) — nunca convertido ou consolidado em um único número no MVP. Decisão de produto fechada com o usuário. (Seção 29)
- **Mês financeiro customizável:** usar sempre a função única `resolveFinancialMonth()`. Nunca duplicar essa regra em Dashboard, Orçamentos ou Relatórios. (Seção 29)
- **Soft delete apenas.** Nenhum `DELETE` físico em tabela de domínio, nunca. (RNF06)
- **RLS obrigatório:** toda tabela nova precisa de Row Level Security habilitado e policy testada no **mesmo PR** que a cria. Sem exceções, mesmo temporárias.
- **Transferências são atômicas:** cria as duas pontas (saída/entrada) + rollback total se uma falhar.
- **Categoria excluída** (soft delete) some dos seletores de novo lançamento, mas nunca quebra a exibição em transações históricas.
- **Só folha é lançável (desde a Fase A2 do aprimoramento):** `transactions.category_id` e `recurrence_rules.category_id` só podem ser uma subcategoria ou especial sem filhos — nunca uma categoria-pai. Enforced por trigger (`validate_category_is_leaf`), não só client-side.
- **Orçamento é sempre no nível pai (desde a Fase A2):** `budgets.category_id` só pode ser uma categoria-pai (tem subcategorias) — nunca uma folha. Enforced por trigger (`validate_budget_category_is_parent`). `get_budgets_with_usage()` soma as transações das subcategorias do pai orçado, não transações com `category_id` igual ao do budget.

## Convenções de Banco de Dados (Seção 25/28)

- Toda tabela de domínio tem: `id` (uuid v7), `user_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`.
- RLS padrão: `auth.uid() = user_id AND deleted_at IS NULL`.
- Trigger de auditoria genérica (`set_audit_fields()`) popula `created_by`/`updated_by` via `auth.uid()`.
- `public.user_settings` é 1:1 com `auth.users` (nunca estender `auth.users` diretamente).
- Categorias padrão vêm de `system_categories` (catálogo global), copiadas para o usuário no onboarding via `system_category_id`.
- **Taxonomia de categorias (desde 2026-07-08, aprimoramento em andamento):** `system_categories` tem hierarquia real de 2 níveis via `parent_id` (categoria-pai quando `null`) e uma flag `is_active` (categorias legadas da taxonomia flat original são mantidas com `is_active = false` só por integridade de FK — nunca deletadas, nunca copiadas para novos usuários). Fonte da taxonomia: [fases/CATEGORIAS_REFERENCIA.md](fases/CATEGORIAS_REFERENCIA.md) (16 categorias-pai + 76 subcategorias — a soma "71" no resumo daquele documento está incorreta, ver Log de Decisões do `MEMORY_BANK.md`). Trigger `validate_system_category_type()` garante que toda subcategoria herda o tipo (Receita/Despesa) do pai.

## Modelo de Segurança (Seção 16)

- Autenticação: Supabase Auth (JWT, email/senha).
- Autorização: RLS no banco — nunca confiar em filtro de aplicação como única barreira.
- `SUPABASE_SERVICE_ROLE_KEY` nunca em código client-side / bundle do navegador.

## Fluxo de Trabalho Planejado (Seção 27)

- Ambientes: Local (Supabase via Docker) → Preview (Vercel Deployment por PR) → Produção (branch `main`).
- CI (GitHub Actions): lint → typecheck → testes → build em cada PR.
- Migrations sempre via Supabase CLI dentro do pipeline — nunca alteração manual de schema em produção.

## Decisões de Produto/Arquitetura Já Fechadas (não reabrir sem alinhar com o usuário)

- Patrimônio líquido segregado por moeda, sem conversão cambial.
- Stack definida acima (Next.js + Supabase, sem ORM adicional, sem Supabase Edge Functions).
- UUIDv7 em vez de v4.
  Histórico completo de quando/por que cada decisão foi tomada: ver Log de Decisões em [MEMORY_BANK.md](MEMORY_BANK.md).

## Fora do MVP — Conscientemente Adiado (Seção 21/31)

Anexos/comprovantes em transações · Exportação de dados (LGPD) · Conversão cambial · Open Finance · Rate limiting de API · Sincronização offline de escrita na PWA.

## Ordem de Desenvolvimento

Fase 0 (Fundação) → Fase 1 (Core Ledger) → Fase 2 (Cartões) → Fase 3 (Dashboard/PWA) → Fase 4 (Orçamentos/Recorrências) → Fase 5 (Empréstimos/Metas/Busca) → Fase 6 (Hardening/Lançamento). Detalhe completo em [fases/INDICE.md](fases/INDICE.md).

**Todas as fases concluídas.** App em produção: https://financeiro-virid-phi.vercel.app/

## Stack Real Implantada (pode diferir levemente do planejamento original)

- **Next.js 16.2.9** com Turbopack e App Router. Middleware usa `src/proxy.ts` (`export { proxy }`) — Next 16 deprecou `middleware.ts`.
- **Sentry:** configurado via `src/instrumentation.ts` (`register()` hook) — **não** `withSentryConfig` (incompatível com Turbopack).
- **pnpm 11:** `allowBuilds` configurado em `pnpm-workspace.yaml` (não em `package.json` — campo ignorado no pnpm 11).
- **29 rotas** no build local mais recente (após o aprimoramento de categorias — contagem pode divergir da última medição em produção até o próximo deploy).
- **Vitest 34/34 testes** passando (28 do MVP + 6 novos de `financial-indicators.test.ts`); 3 golden paths Playwright em `e2e/`.
- **Vercel Cron:** `vercel.json` com `close-invoices` às 03:00 UTC e `generate-recurrences` às 04:00 UTC.

## Próximas Evoluções Possíveis (V2)

Exportação de dados (CSV/PDF) · Conversão cambial · Notificações push · Relatórios com gráficos (recharts) · Open Finance · Rate limiting de API · Sincronização offline de escrita.
