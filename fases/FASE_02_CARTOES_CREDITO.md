# Fase 2 — Credit Management (Cartões, Faturas, Parcelamentos)

> Bounded Context: Credit Management. Ver [INDICE.md](INDICE.md).

## Objetivo

Modelar a mecânica de cartão de crédito (Seção 10 do planejamento macro): fechamento de fatura, parcelamento e pagamento — uma das áreas de maior complexidade e maior risco de bug do sistema.

## Pré-requisitos

Fase 1 completa (depende de `transactions` e `categories` já existirem e funcionarem).

## Passos de Desenvolvimento

### 1. Modelagem (migrations)

```sql
create table public.credit_cards (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  credit_limit numeric(18,8) not null,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  default_account_id uuid references public.accounts(id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

create table public.invoices (
  id uuid primary key default uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  credit_card_id uuid not null references public.credit_cards(id),
  reference_month date not null, -- primeiro dia do mês de referência
  status text not null check (status in ('Aberta','Fechada','Paga','Vencida')),
  closing_date date not null,
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  unique (credit_card_id, reference_month)
);

alter table public.transactions
  add constraint fk_transactions_invoice foreign key (invoice_id) references public.invoices(id),
  add column purchase_group_id uuid; -- liga as N parcelas de uma mesma compra parcelada
```

Habilitar RLS + policies em `credit_cards` e `invoices` (padrão da Fase 0).

### 2. Lógica de fechamento (regra de negócio crítica — Seção 10)

2.1. Implementar como **função pura TypeScript**, testável isoladamente em Vitest, sem I/O:

```ts
function resolveInvoiceForPurchase(
  purchaseDate: Date,
  card: { closingDay: number }
): { referenceMonth: Date } {
  // compra antes ou no dia de fechamento -> fatura do mês corrente
  // compra após o dia de fechamento -> fatura do mês seguinte
}
```

2.2. Testar exaustivamente casos de borda: compra exatamente no `closing_day`, mês com menos dias que `closing_day` (ex: fechamento dia 31 em fevereiro), troca de fuso horário do usuário (Risco 2, Seção 24 — usar o `timezone` de `user_settings`, nunca UTC puro para decidir "o dia" da compra).
2.3. Ao registrar uma compra no cartão, garantir que a `Invoice` de destino existe (criar sob demanda com status `Aberta` se ainda não existir) antes de inserir a `transaction`.

### 3. Parcelamento

3.1. Ao criar uma compra parcelada em N vezes: gerar N `transactions`, uma por fatura subsequente (cada uma resolvida via `resolveInvoiceForPurchase` a partir da data de cada parcela), todas compartilhando o mesmo `purchase_group_id`.
3.2. `amount = total / N`, tratando o resto de centavos na primeira parcela (nunca perder ou inventar centavos pela divisão).

### 4. Fechamento automático de fatura (cron)

4.1. Vercel Cron Job diário chamando `POST /api/cron/close-invoices`.
4.2. Para cada cartão cujo `closing_day` é hoje (no timezone do usuário): muda a `Invoice` correspondente de `Aberta` para `Fechada`, calcula `total_amount` (soma das transactions vinculadas), emite evento `InvoiceClosed`.

### 5. Pagamento de Fatura (`PagarFaturaCartao` — fluxo já documentado na Seção 13 do planejamento macro)

5.1. Route Handler transacional: `POST /api/credit-cards/pay-invoice`.
5.2. Recebe `invoice_id` + `account_id` de origem. Dentro de uma transação SQL: cria `transaction` de despesa na conta de origem (categoria "Pagamento de Cartão") → marca `Invoice.status = 'Paga'` → emite `TransactionPaid` + `InvoicePaid`.
5.3. O limite disponível do cartão é sempre **calculado** (`credit_limit - SUM(faturas Abertas/Fechadas não pagas)`), nunca armazenado como coluna — mesma lógica de Single Source of Truth da Fase 1.

### 6. UI/Features (`/src/features/credit-cards`)

6.1. Tela do cartão: limite disponível (calculado), fatura atual (Aberta) e fatura fechada a pagar.
6.2. Formulário de compra (à vista ou parcelada em N vezes).
6.3. Botão "Pagar Fatura" com seleção de conta de origem.

## Critérios de Conclusão da Fase 2

- [ ] Compra feita antes do fechamento cai na fatura atual; compra feita depois cai na próxima (testado com datas de borda, incluindo o próprio dia de fechamento).
- [ ] Parcelamento em N vezes gera exatamente N transações, somando ao centavo o valor total da compra.
- [ ] Pagamento de fatura atualiza conta, status da fatura e limite disponível em uma única ação do usuário.
- [ ] Cron de fechamento muda o status da fatura corretamente sem intervenção manual.

## Riscos Específicos desta Fase

- Fuso horário é o risco mais provável de bug silencioso aqui (Risco 2, Seção 24): uma compra às 23h59 no horário local pode cair no dia seguinte em UTC e mudar de fatura. Sempre resolver "o dia da compra" no timezone do usuário antes de comparar com `closing_day`.
- `purchase_group_id` precisa estar presente desde a criação da primeira parcela — não é algo para "adicionar depois"; sem ele, cancelar/editar um parcelamento inteiro fica impossível de implementar corretamente.
