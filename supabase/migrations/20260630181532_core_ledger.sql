-- =========================================================================
-- Fase 1 — Core Ledger (Contas, Categorias, Transações, Transferências)
-- Ver AGENTS.md e fases/FASE_01_CORE_LEDGER.md.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. accounts
-- -------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  currency text not null check (currency in ('BRL', 'USD', 'BTC')),
  icon text,
  color text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

comment on table public.accounts is
  'Contas do usuário. Sem coluna de saldo — saldo é sempre soma on-the-fly das transactions pagas (Seção 10/29).';

alter table public.accounts enable row level security;

create policy "accounts_select_own_not_deleted" on public.accounts
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id);

create trigger trg_accounts_audit
  before insert or update on public.accounts
  for each row execute function public.set_audit_fields();

-- -------------------------------------------------------------------------
-- 2. categories (cópia por usuário de system_categories, Seção 28)
-- -------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null check (type in ('Receita', 'Despesa', 'Ambas')),
  system_category_id uuid references public.system_categories(id),
  parent_category_id uuid references public.categories(id),
  icon text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid
);

comment on column public.categories.system_category_id is
  'Vínculo nunca exposto na UI — preserva base para IA anonimizada (Seção 23/28). Usuário pode renomear/desativar livremente sua cópia.';

alter table public.categories enable row level security;

create policy "categories_select_own_not_deleted" on public.categories
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id);

create trigger trg_categories_audit
  before insert or update on public.categories
  for each row execute function public.set_audit_fields();

-- -------------------------------------------------------------------------
-- 3. transactions
-- -------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  account_id uuid references public.accounts(id),
  invoice_id uuid, -- usado a partir da Fase 2; FK adicionada na migration da Fase 2
  category_id uuid references public.categories(id),
  type text not null check (type in ('receita', 'despesa', 'transferencia')),
  status text not null check (status in ('Pendente', 'Pago', 'Vencido', 'Cancelado')),
  amount numeric(18, 8) not null,
  currency text not null check (currency in ('BRL', 'USD', 'BTC')),
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

comment on column public.transactions.amount is
  'Convenção de sinal decidida na inserção (Risco da Fase 1): receita > 0, despesa < 0. Transferência: perna de saída < 0, perna de entrada > 0 — assim SUM() simples já calcula o saldo correto sem casos especiais.';

create index idx_transactions_account_id on public.transactions(account_id) where deleted_at is null;

alter table public.transactions enable row level security;

create policy "transactions_select_own_not_deleted" on public.transactions
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);

create trigger trg_transactions_audit
  before insert or update on public.transactions
  for each row execute function public.set_audit_fields();

-- -------------------------------------------------------------------------
-- 4. transfers (tabela de ligação leve — sem soft delete/auditoria completa,
--    igual ao desenho original da Seção 14/FASE_01: é só o vínculo entre as
--    duas pernas já criadas em `transactions`, que sim têm soft delete).
-- -------------------------------------------------------------------------
create table public.transfers (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users(id),
  origin_transaction_id uuid not null unique references public.transactions(id),
  destination_transaction_id uuid not null unique references public.transactions(id),
  created_at timestamptz not null default now()
);

alter table public.transfers enable row level security;

create policy "transfers_select_own" on public.transfers
  for select using (auth.uid() = user_id);
create policy "transfers_insert_own" on public.transfers
  for insert with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 5. Onboarding (completa o item deixado pendente na Fase 0): copia
--    system_categories -> categories do novo usuário, preenchendo
--    system_category_id (Seção 28).
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (id) values (new.id);

  insert into public.categories (user_id, name, type, system_category_id, icon)
  select new.id, sc.name, sc.type, sc.id, sc.icon
  from public.system_categories sc;

  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 6. Saldo (Single Source of Truth — Seção 29): sempre soma on-the-fly,
--    nunca uma coluna armazenada.
-- -------------------------------------------------------------------------
create or replace function public.get_account_balance(p_account_id uuid)
returns numeric(18, 8)
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.transactions
  where account_id = p_account_id
    and status = 'Pago'
    and deleted_at is null;
$$;

comment on function public.get_account_balance(uuid) is
  'SECURITY INVOKER (padrão) de propósito: roda com o role do chamador, então RLS de transactions já garante que ninguém calcula saldo de conta alheia (retorna 0 em vez de vazar dado).';

-- -------------------------------------------------------------------------
-- 7. Criar conta + transação de sistema "Saldo Inicial" atomicamente
--    (Seção 14/29 — saldo inicial não é coluna, é uma Transaction).
-- -------------------------------------------------------------------------
create or replace function public.create_account_with_initial_balance(
  p_name text,
  p_currency text,
  p_icon text,
  p_color text,
  p_initial_balance numeric(18, 8),
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
as $$
declare
  v_account_id uuid;
  v_category_id uuid;
  v_type text;
begin
  insert into public.accounts (user_id, name, currency, icon, color)
  values (auth.uid(), p_name, p_currency, p_icon, p_color)
  returning id into v_account_id;

  if p_initial_balance <> 0 then
    select id into v_category_id
    from public.categories
    where user_id = auth.uid()
      and system_category_id = (
        select id from public.system_categories where name = 'Saldo Inicial' and is_internal = true
      )
    limit 1;

    if v_category_id is null then
      raise exception 'Categoria de sistema "Saldo Inicial" não encontrada para o usuário — onboarding pode ter falhado.';
    end if;

    v_type := case when p_initial_balance >= 0 then 'receita' else 'despesa' end;

    insert into public.transactions (
      user_id, account_id, category_id, type, status, amount, currency,
      description, occurred_at, paid_at
    ) values (
      auth.uid(), v_account_id, v_category_id, v_type, 'Pago', p_initial_balance, p_currency,
      'Saldo Inicial', p_occurred_at, p_occurred_at
    );
  end if;

  return v_account_id;
end;
$$;

comment on function public.create_account_with_initial_balance(text, text, text, text, numeric, timestamptz) is
  'SECURITY INVOKER: cria a conta e (se != 0) a transaction de sistema "Saldo Inicial" numa única chamada atômica. RLS de accounts/transactions/categories já garante que só opera sobre dados do próprio auth.uid().';

-- -------------------------------------------------------------------------
-- 8. Transferência atômica entre contas da mesma moeda (Seção 10 — "são
--    atômicas, rollback total em falha parcial").
-- -------------------------------------------------------------------------
create or replace function public.efetivar_transferencia(
  p_origin_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric(18, 8),
  p_description text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
as $$
declare
  v_origin_currency text;
  v_destination_currency text;
  v_origin_tx_id uuid;
  v_destination_tx_id uuid;
  v_transfer_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'O valor da transferência deve ser positivo.';
  end if;

  if p_origin_account_id = p_destination_account_id then
    raise exception 'A conta de origem e destino não podem ser a mesma.';
  end if;

  select currency into v_origin_currency
  from public.accounts
  where id = p_origin_account_id and user_id = auth.uid() and deleted_at is null;

  select currency into v_destination_currency
  from public.accounts
  where id = p_destination_account_id and user_id = auth.uid() and deleted_at is null;

  if v_origin_currency is null or v_destination_currency is null then
    raise exception 'Conta de origem ou destino inválida.';
  end if;

  if v_origin_currency <> v_destination_currency then
    raise exception 'Transferência só é permitida entre contas da mesma moeda (sem câmbio no MVP — Seção 31).';
  end if;

  insert into public.transactions (
    user_id, account_id, category_id, type, status, amount, currency,
    description, occurred_at, paid_at
  ) values (
    auth.uid(), p_origin_account_id, null, 'transferencia', 'Pago', -p_amount, v_origin_currency,
    p_description, p_occurred_at, p_occurred_at
  ) returning id into v_origin_tx_id;

  insert into public.transactions (
    user_id, account_id, category_id, type, status, amount, currency,
    description, occurred_at, paid_at
  ) values (
    auth.uid(), p_destination_account_id, null, 'transferencia', 'Pago', p_amount, v_destination_currency,
    p_description, p_occurred_at, p_occurred_at
  ) returning id into v_destination_tx_id;

  insert into public.transfers (user_id, origin_transaction_id, destination_transaction_id)
  values (auth.uid(), v_origin_tx_id, v_destination_tx_id)
  returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;

comment on function public.efetivar_transferencia(uuid, uuid, numeric, text, timestamptz) is
  'SECURITY INVOKER, atômica por natureza (uma única chamada de função = uma transação Postgres implícita): se qualquer insert falhar, tudo é revertido. type = ''transferencia'' (não despesa/receita) e category_id nulo — decisão registrada no MEMORY_BANK.md: transferências entre contas próprias não devem poluir relatórios/orçamentos de receita-despesa nas Fases 4+.';
