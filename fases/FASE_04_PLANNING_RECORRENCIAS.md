# Fase 4 — Planning: Orçamentos, Recorrências e Mês Financeiro

> Bounded Context: Planning & Tracking. Ver [INDICE.md](INDICE.md). Cobre os itens "Should Have" do backlog (Seção 21 do planejamento macro) — pode ser adiada sem comprometer o lançamento do MVP mínimo.

## Objetivo

Reduzir o atrito de registro manual (recorrências) e dar controle proativo de gastos (orçamentos com alertas).

## Pré-requisitos

Fases 0 a 3 completas.

## Passos de Desenvolvimento

### 1. Orçamentos (Budgets)

1.1. Modelagem:

```sql
create table public.budgets (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  category_id uuid not null references public.categories(id),
  amount_limit numeric(18,8) not null,
  reference_month date not null,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid,
  unique (user_id, category_id, reference_month)
);
```

Habilitar RLS + policies (padrão da Fase 0).
1.2. Cálculo do percentual usado: `SUM(transactions.amount) WHERE category_id = X AND status = 'Pago' AND occurred_at dentro do intervalo de resolveFinancialMonth(...)` **reaproveitando** a função criada na Fase 3 — Seção 29 do planejamento macro proíbe duplicar essa lógica em cada módulo.
1.3. Evento `BudgetExceeded` disparado quando o percentual atinge 100%. Alerta visual também aos 80% (RF06).
1.4. UI: barra de progresso por categoria, com cores (verde < 80%, amarelo 80-99%, vermelho ≥ 100%).

### 2. Recorrências (Engine de Cron)

2.1. Modelagem:

```sql
create table public.recurrence_rules (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  account_id uuid references public.accounts(id),
  credit_card_id uuid references public.credit_cards(id),
  category_id uuid not null references public.categories(id),
  amount numeric(18,8) not null,
  currency text not null check (currency in ('BRL','USD','BTC')),
  description text,
  frequency text not null check (frequency in ('diaria','semanal','mensal','anual')),
  next_occurrence_date date not null,
  end_date date,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid,
  constraint chk_account_or_card check (
    (account_id is not null and credit_card_id is null) or
    (account_id is null and credit_card_id is not null)
  )
);
```

Habilitar RLS + policies.
2.2. Vercel Cron Job diário: `POST /api/cron/generate-recurrences`. Busca regras com `next_occurrence_date <= hoje` e `deleted_at is null`, cria a `transaction` real a partir do template (reaproveitando a lógica de criação de despesa/receita da Fase 1, ou de compra no cartão da Fase 2 se `credit_card_id` estiver preenchido), avança `next_occurrence_date` conforme `frequency`, e respeita `end_date` (não gera mais ocorrências após essa data).
2.3. Emitir evento `RecurringTransactionGenerated` a cada execução.
2.4. UI: tela de gestão de recorrências (criar/editar/cancelar regra), listando as próximas ocorrências previstas.

## Critérios de Conclusão da Fase 4

- [ ] Orçamento calcula o percentual usado respeitando o mês financeiro configurado (testado com `financial_month_start_day` diferente de 1).
- [ ] Alerta visual aparece corretamente aos 80% e aos 100% do limite.
- [ ] Recorrência gera a transação automaticamente no dia certo, sem ação manual do usuário, e nunca gera duplicado em re-execuções do cron no mesmo dia (idempotência).
- [ ] Recorrência respeita `end_date` quando configurada.

## Riscos Específicos desta Fase

- O cron de recorrências rodando duas vezes no mesmo dia (re-tentativa de infraestrutura) pode duplicar lançamentos se não houver checagem de idempotência — validar `next_occurrence_date` dentro de uma transação SQL com lock, ou usar uma constraint de unicidade (`recurrence_rule_id` + `reference_date`) na tabela de transações geradas.
- Orçamento e Dashboard calculando "mês financeiro" de formas diferentes é o erro mais fácil de reintroduzir aqui — sempre importar `resolveFinancialMonth` da Fase 3, nunca reimplementar.
