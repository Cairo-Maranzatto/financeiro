# Fase 1 — Core Ledger (Contas, Categorias, Transações, Transferências)

> Bounded Context: Core Ledger (o coração financeiro do sistema). Ver [INDICE.md](INDICE.md).

## Objetivo

Entregar o CRUD essencial de contas e lançamentos com saldo sempre correto — a funcionalidade sem a qual nenhum outro módulo (cartões, orçamentos, dashboard) tem sentido.

## Pré-requisitos

Fase 0 completa (stack, Supabase, RLS, auditoria, autenticação funcionando).

## Passos de Desenvolvimento

### 1. Modelagem (migrations)

```sql
create table public.accounts (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  currency text not null check (currency in ('BRL','USD','BTC')),
  icon text,
  color text,
  created_at timestamptz not null default now(),
  created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);
-- Nota: NÃO existe coluna de saldo (decisão Seção 14/29 do planejamento macro).

create table public.categories (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null check (type in ('Receita','Despesa','Ambas')),
  system_category_id uuid references public.system_categories(id),
  parent_category_id uuid references public.categories(id),
  icon text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

create table public.transactions (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  account_id uuid references public.accounts(id),
  invoice_id uuid, -- usado a partir da Fase 2; FK adicionada na migration da Fase 2
  category_id uuid references public.categories(id),
  type text not null check (type in ('receita','despesa','transferencia')),
  status text not null check (status in ('Pendente','Pago','Vencido','Cancelado')),
  amount numeric(18,8) not null,
  currency text not null check (currency in ('BRL','USD','BTC')),
  description text,
  occurred_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid,
  constraint chk_account_or_invoice check (
    (account_id is not null and invoice_id is null) or
    (account_id is null and invoice_id is not null)
  )
);

create table public.transfers (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  origin_transaction_id uuid not null unique references public.transactions(id),
  destination_transaction_id uuid not null unique references public.transactions(id),
  created_at timestamptz not null default now()
);
```

Habilitar RLS + policies (padrão da Fase 0) em `accounts`, `categories`, `transactions`, `transfers` no mesmo PR que as cria.

### 2. Value Objects de domínio (`/src/shared/domain`)

2.1. `Money`: `{ amount: number, currency: 'BRL'|'USD'|'BTC' }` com `add`/`subtract` que lançam erro se as moedas diferirem (nunca somar BRL com BTC).
2.2. `TransactionStatus`: union type `'Pendente'|'Pago'|'Vencido'|'Cancelado'`.

### 3. Saldo Inicial como Transaction de sistema

3.1. Ao criar uma `Account`, a operação (pode ser uma única chamada Supabase com RPC/transação, não precisa de Route Handler dedicada por ser simples) insere a conta **e** uma `transaction` de categoria de sistema "Saldo Inicial" (status `Pago`, `occurred_at` = data informada pelo usuário), na mesma transação SQL.
3.2. Essa transação de sistema não aparece como editável/excluível na UI (filtrar pelo nome/flag da categoria de sistema).

### 4. Cálculo de saldo (Single Source of Truth — Seção 29)

4.1. Criar função SQL `get_account_balance(p_account_id uuid)` retornando `SUM(amount)` das transactions com `status = 'Pago'` e `deleted_at is null` daquela conta (receita soma positivo, despesa soma negativo — decidir o sinal na inserção, não no cálculo).
4.2. **Nunca** armazenar saldo como coluna em `accounts`. Toda exibição de saldo chama essa função (ou a query equivalente) em tempo real.

### 5. Caso de uso: Transferência (`EfetivarTransferencia`)

5.1. Única Route Handler transacional desta fase: `POST /api/transactions/transfer`.
5.2. Dentro de uma função Postgres (`rpc`) ou transação explícita: cria a `transaction` de saída na conta origem (despesa) + a `transaction` de entrada na conta destino (receita) + o registro em `transfers`. Se qualquer etapa falhar, nenhuma é persistida (rollback).
5.3. Restrição do MVP: transferência apenas entre contas da **mesma moeda** (sem FX automático — Seção 31). Bloquear no formulário e na validação Zod do payload.
5.4. `RegistrarDespesa`/`RegistrarReceita`: não precisam de Route Handler dedicada — são INSERTs diretos de 1 tabela via Supabase client, protegidos pelo RLS.

### 6. UI/Features (`/src/features/accounts`, `/src/features/transactions`)

6.1. Lista de contas com saldo calculado (chamando a função/query do passo 4).
6.2. Formulário de nova despesa/receita (React Hook Form + Zod), com seletor de categoria/subcategoria.
6.3. Formulário de transferência entre contas (mesma moeda).
6.4. Extrato/lista de transações por conta, com filtro de período.

### 7. Eventos de domínio (mínimo necessário nesta fase)

7.1. Emitir `TransactionCreated`/`TransactionPaid` (pode ser apenas uma função TypeScript chamada após o insert, sem broker de mensagens real ainda) cujo único listener no MVP é invalidar o cache do TanStack Query relacionado (saldo da conta, lista de transações). Prepara terreno para listeners futuros (Seção 11/23) sem exigir infraestrutura de fila agora.

## Critérios de Conclusão da Fase 1

- [ ] Usuário cria conta com saldo inicial, lança despesas/receitas, e o saldo exibido reflete corretamente cada lançamento.
- [ ] Transferência entre 2 contas da mesma moeda nunca deixa saldo inconsistente, mesmo simulando falha no meio da operação (testado via teste de integração).
- [ ] Categorias padrão aparecem nos seletores de novo lançamento.
- [ ] Uma categoria "excluída" (soft delete) some dos seletores, mas transações antigas continuam mostrando seu nome corretamente.
- [ ] Nenhuma tabela desta fase permite acesso cruzado entre usuários (revalidar RLS).

## Riscos Específicos desta Fase

- Erro de sinal (positivo/negativo) na inserção de receita vs. despesa é o bug mais fácil de cometer e mais caro de não detectar — cobrir com teste unitário da função de cálculo de saldo.
- `chk_account_or_invoice` (constraint polimórfica) só será exercitada de fato na Fase 2 — garantir que o constraint está correto agora, antes de existir `invoice_id` populado, para não precisar de migration corretiva depois.
