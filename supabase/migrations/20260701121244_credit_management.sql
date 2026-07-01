-- =========================================================================
-- Fase 2 — Credit Management (Cartões, Faturas, Parcelamentos)
-- Ver AGENTS.md e fases/FASE_02_CARTOES_CREDITO.md.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. credit_cards
-- -------------------------------------------------------------------------
create table public.credit_cards (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  credit_limit numeric(18, 8) not null check (credit_limit > 0),
  closing_day int not null check (closing_day between 1 and 28),
  due_day int not null check (due_day between 1 and 28),
  default_account_id uuid references public.accounts(id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

comment on column public.credit_cards.closing_day is
  'Dia de fechamento mensal (1-28 — 28 é o máximo seguro para todos os meses, evitando ambiguidade em fevereiro, Risco 2/Seção 24). "O dia" é sempre resolvido no timezone do usuário, nunca em UTC puro.';
comment on column public.credit_cards.due_day is
  'Dia de vencimento mensal (1-28). Vencimento cai no mês seguinte ao fechamento.';

alter table public.credit_cards enable row level security;

create policy "credit_cards_select_own" on public.credit_cards
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "credit_cards_insert_own" on public.credit_cards
  for insert with check (auth.uid() = user_id);
create policy "credit_cards_update_own" on public.credit_cards
  for update using (auth.uid() = user_id);

create trigger trg_credit_cards_audit
  before insert or update on public.credit_cards
  for each row execute function public.set_audit_fields();

-- -------------------------------------------------------------------------
-- 2. invoices
-- -------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null default auth.uid() references auth.users(id),
  credit_card_id uuid not null references public.credit_cards(id),
  reference_month date not null, -- ex: '2026-06-01' para a fatura de junho
  status text not null check (status in ('Aberta', 'Fechada', 'Paga', 'Vencida')),
  closing_date date not null,
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  unique (credit_card_id, reference_month)
);

comment on column public.invoices.reference_month is
  'Primeiro dia do mês de referência da fatura (ex: 2026-06-01 para a fatura de junho). Chave natural única por cartão.';

create index idx_invoices_credit_card_status on public.invoices(credit_card_id, status);

alter table public.invoices enable row level security;

create policy "invoices_select_own" on public.invoices
  for select using (auth.uid() = user_id);
create policy "invoices_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);
create policy "invoices_update_own" on public.invoices
  for update using (auth.uid() = user_id);

create trigger trg_invoices_audit
  before insert or update on public.invoices
  for each row execute function public.set_audit_fields();

-- -------------------------------------------------------------------------
-- 3. Evoluir transactions: FK em invoice_id (estava sem FK desde a Fase 1,
--    conforme anotado na migration 20260630181532) e coluna purchase_group_id
--    (agrupa as N parcelas de uma mesma compra parcelada).
-- -------------------------------------------------------------------------
alter table public.transactions
  add constraint fk_transactions_invoice
    foreign key (invoice_id) references public.invoices(id),
  add column purchase_group_id uuid;

comment on column public.transactions.purchase_group_id is
  'Liga as N parcelas de uma compra parcelada. Nulo para compras à vista. Todas as parcelas da mesma compra compartilham o mesmo valor, gerado uma única vez na criação.';

-- -------------------------------------------------------------------------
-- 4. Saldo total de uma fatura (soma das transactions vinculadas, sempre
--    on-the-fly — mesma lógica Single Source of Truth da Fase 1).
-- -------------------------------------------------------------------------
create or replace function public.get_invoice_total(p_invoice_id uuid)
returns numeric(18, 8)
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.transactions
  where invoice_id = p_invoice_id
    and deleted_at is null;
$$;

-- -------------------------------------------------------------------------
-- 5. Limite disponível do cartão (Seção 5.3 do FASE_02):
--    credit_limit - SUM(faturas Abertas e Fechadas ainda não pagas).
-- -------------------------------------------------------------------------
create or replace function public.get_card_available_limit(p_card_id uuid)
returns numeric(18, 8)
language sql
stable
as $$
  select c.credit_limit - coalesce((
    select sum(public.get_invoice_total(i.id))
    from public.invoices i
    where i.credit_card_id = p_card_id
      and i.status in ('Aberta', 'Fechada')
  ), 0)
  from public.credit_cards c
  where c.id = p_card_id
    and c.user_id = auth.uid()
    and c.deleted_at is null;
$$;

-- -------------------------------------------------------------------------
-- 6. Garantir que a fatura do mês certo existe, criando-a se necessário
--    (a lógica de "qual mês" é resolvida no TypeScript, que só passa aqui
--    o reference_month já calculado com timezone correto).
-- -------------------------------------------------------------------------
create or replace function public.get_or_create_invoice(
  p_card_id uuid,
  p_reference_month date,
  p_closing_date date,
  p_due_date date
)
returns uuid
language plpgsql
as $$
declare
  v_invoice_id uuid;
begin
  select id into v_invoice_id
  from public.invoices
  where credit_card_id = p_card_id
    and reference_month = p_reference_month;

  if v_invoice_id is null then
    insert into public.invoices (
      user_id, credit_card_id, reference_month, status, closing_date, due_date
    ) values (
      auth.uid(), p_card_id, p_reference_month, 'Aberta', p_closing_date, p_due_date
    ) returning id into v_invoice_id;
  end if;

  return v_invoice_id;
end;
$$;

-- -------------------------------------------------------------------------
-- 7. Registrar compra no cartão (à vista ou parcelada).
--    O TypeScript resolve "qual fatura" e quais datas (com timezone do
--    usuário — Risco 2/Seção 24) antes de chamar esta função.
--    Recebe um array de parcelas (JSON), cada uma com {invoice_id, amount,
--    occurred_at}, geradas pelo front-end usando resolveInvoiceForPurchase.
-- -------------------------------------------------------------------------
create or replace function public.registrar_compra_cartao(
  p_installments jsonb,
  p_category_id uuid,
  p_description text default null,
  p_purchase_group_id uuid default public.uuid_generate_v7()
)
returns void
language plpgsql
as $$
declare
  installment jsonb;
begin
  for installment in select * from jsonb_array_elements(p_installments)
  loop
    insert into public.transactions (
      user_id, invoice_id, category_id, type, status, amount, currency,
      description, occurred_at, paid_at, purchase_group_id
    ) values (
      auth.uid(),
      (installment->>'invoice_id')::uuid,
      p_category_id,
      'despesa',
      'Pendente',
      (installment->>'amount')::numeric,
      installment->>'currency',
      p_description,
      (installment->>'occurred_at')::timestamptz,
      null,
      p_purchase_group_id
    );
  end loop;
end;
$$;

-- -------------------------------------------------------------------------
-- 8. Pagamento de fatura (atômico: despesa na conta + Invoice -> 'Paga').
-- -------------------------------------------------------------------------
create or replace function public.pagar_fatura(
  p_invoice_id uuid,
  p_account_id uuid,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql
as $$
declare
  v_invoice record;
  v_total numeric(18, 8);
  v_pagamento_category_id uuid;
begin
  select i.*, c.user_id as card_user_id
  into v_invoice
  from public.invoices i
  join public.credit_cards c on c.id = i.credit_card_id
  where i.id = p_invoice_id
    and c.user_id = auth.uid();

  if not found then
    raise exception 'Fatura não encontrada ou acesso não permitido.';
  end if;

  if v_invoice.status = 'Paga' then
    raise exception 'Esta fatura já foi paga.';
  end if;

  v_total := public.get_invoice_total(p_invoice_id);

  if v_total <= 0 then
    raise exception 'A fatura não possui valor a pagar.';
  end if;

  -- Categoria "Pagamento de Cartão" do usuário
  select id into v_pagamento_category_id
  from public.categories
  where user_id = auth.uid()
    and system_category_id = (
      select id from public.system_categories where name = 'Pagamento de Cartão'
    )
  limit 1;

  -- Débito na conta de origem
  insert into public.transactions (
    user_id, account_id, category_id, type, status, amount, currency,
    description, occurred_at, paid_at
  ) values (
    auth.uid(), p_account_id, v_pagamento_category_id, 'despesa', 'Pago', -v_total,
    (select currency from public.accounts where id = p_account_id),
    'Pagamento de fatura: ' || v_invoice.reference_month::text,
    p_paid_at, p_paid_at
  );

  -- Marca as transações da fatura como pagas
  update public.transactions
  set status = 'Pago', paid_at = p_paid_at
  where invoice_id = p_invoice_id
    and deleted_at is null;

  -- Atualiza status da fatura
  update public.invoices
  set status = 'Paga', paid_at = p_paid_at
  where id = p_invoice_id;
end;
$$;
