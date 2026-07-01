-- =========================================================================
-- Fase 1 — ajustes de DX sobre a migration anterior (20260630181532):
-- 1) user_id com default auth.uid() (o trigger set_audit_fields() já fazia
--    o coalesce, mas sem default a coluna fica obrigatória no tipo Insert
--    gerado pelo supabase gen types, forçando o client a repetir auth.uid()
--    manualmente em todo insert direto).
-- 2) Parâmetros opcionais nas funções RPC (p_icon/p_color/p_description/
--    p_initial_balance/p_occurred_at) ganham DEFAULT, virando `?:` opcional
--    no TypeScript gerado em vez de exigir `null` explícito.
-- =========================================================================

alter table public.accounts alter column user_id set default auth.uid();
alter table public.categories alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.transfers alter column user_id set default auth.uid();

create or replace function public.create_account_with_initial_balance(
  p_name text,
  p_currency text,
  p_icon text default null,
  p_color text default null,
  p_initial_balance numeric(18, 8) default 0,
  p_occurred_at timestamptz default now()
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

create or replace function public.efetivar_transferencia(
  p_origin_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric(18, 8),
  p_description text default null,
  p_occurred_at timestamptz default now()
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
