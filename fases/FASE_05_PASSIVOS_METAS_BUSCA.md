# Fase 5 — Liabilities, Goals e Busca Global

> Bounded Contexts: Liabilities + Planning & Tracking (Goals). Ver [INDICE.md](INDICE.md). Cobre os itens "Could Have" do backlog (Seção 21 do planejamento macro) — a fase mais flexível para adiar para depois do lançamento, se necessário.

## Objetivo

Completar o backlog desejável do MVP: passivos (empréstimos), metas financeiras e busca unificada.

## Pré-requisitos

Fases 0 a 4 completas (Metas podem depender de Recorrências/Orçamentos para consistência de UX, mas não tecnicamente).

## Passos de Desenvolvimento

### 1. Empréstimos (Loans)

1.1. Modelagem:

```sql
create table public.loans (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  principal_amount numeric(18,8) not null,
  interest_rate numeric(7,4) not null,
  installments_count int not null,
  default_account_id uuid references public.accounts(id),
  status text not null check (status in ('Ativo','Quitado','Cancelado')),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

create table public.loan_installments (
  id uuid primary key default uuid_generate_v7(),
  loan_id uuid not null references public.loans(id),
  installment_number int not null,
  amount numeric(18,8) not null,
  due_date date not null,
  status text not null check (status in ('Pendente','Pago','Vencido')),
  transaction_id uuid references public.transactions(id),
  unique (loan_id, installment_number)
);
```

Habilitar RLS + policies em `loans` (loan_installments herda segurança via join — adicionar policy própria checando `loan_id` pertence ao usuário).
1.2. Por que tabela própria em vez de reaproveitar `purchase_group_id` dos cartões (Fase 2): empréstimo tem amortização e juros por parcela, não é uma divisão linear simples — modelar como entidade própria evita forçar uma analogia que não se sustenta.
1.3. Caso de uso `PagarParcelaEmprestimo`: gera uma `transaction` de despesa na conta selecionada + marca a `loan_installment` como `Paga`, vinculando `transaction_id`.
1.4. UI: tela do empréstimo com tabela de parcelas (pagas/pendentes) e botão de pagamento parcela a parcela.

### 2. Metas Financeiras (Goals)

2.1. Modelagem:

```sql
create table public.goals (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  target_amount numeric(18,8) not null,
  currency text not null check (currency in ('BRL','USD','BTC')),
  target_date date,
  status text not null check (status in ('Em andamento','Concluída','Cancelada')),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

create table public.goal_allocations (
  id uuid primary key default uuid_generate_v7(),
  goal_id uuid not null references public.goals(id),
  amount numeric(18,8) not null,
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);
```

Habilitar RLS + policies em `goals` (mesma lógica de herança para `goal_allocations`).
2.2. `current_amount` é sempre calculado pela soma de `goal_allocations` (Single Source of Truth, mesma filosofia da Fase 1) — nunca armazenado como coluna.
2.3. Caso de uso `AlocarRecursoNaMeta`: cria um `goal_allocation`, opcionalmente vinculado a uma transferência real de uma conta (`transaction_id` preenchido) ou apenas um registro manual de progresso.
2.4. Evento `GoalCompleted` disparado quando `current_amount >= target_amount` — muda `status` para `Concluída`.

### 3. Busca Global (Omnisearch — RF09)

3.1. MVP pragmático: `GET /api/search?q=` fazendo `ILIKE '%termo%'` em `transactions.description`, `categories.name`, `accounts.name`, `goals.name`, `loans.name`, todos filtrados por `user_id` (RLS já garante isso se a query passar pelo client autenticado).
3.2. Não introduzir motor de busca dedicado (Elasticsearch/Algolia) — volume de dados pessoal não justifica essa complexidade no MVP.
3.3. UI: input de busca global no header, resultados agrupados por tipo (Transações, Contas, Metas, etc.), navegando para o registro correspondente ao clicar.

## Critérios de Conclusão da Fase 5

- [ ] Empréstimo gera N parcelas corretas e permite pagamento parcela a parcela, atualizando o status individual de cada uma.
- [ ] Meta acumula progresso via alocações e dispara `GoalCompleted` automaticamente ao atingir o valor alvo.
- [ ] Busca global retorna resultados relevantes de pelo menos 3 módulos diferentes em uma única consulta, em menos de 500ms.

## Riscos Específicos desta Fase

- Empréstimo com juros compostos mal calculado é um erro de produto grave (mostra ao usuário uma dívida errada) — validar a tabela de amortização com uma calculadora financeira de referência antes de confiar na implementação.
- Busca com `ILIKE` sem índice (`pg_trgm` ou índice GIN) pode ficar lenta conforme o volume de transações cresce — já considerar criar o índice de texto desde esta fase, mesmo que o volume atual não exija.
