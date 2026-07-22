-- Edição de lançamentos (despesa/receita/transferência) — feature nova, fora do
-- aprimoramento de categorias. Contexto: até aqui só existia criação de
-- transações (RLS já tinha policy de UPDATE própria desde a Fase 1, mas nada
-- no app a usava). Esta migration adiciona:
--   1. Trigger que bloqueia edição da transação de sistema "Saldo Inicial".
--   2. Trigger que bloqueia mudar o `type` de uma transação para/de
--      'transferencia' via UPDATE comum (transferências só podem ser editadas
--      pela função atomica abaixo).
--   3. `atualizar_transferencia()` — equivalente de `efetivar_transferencia()`
--      para edição: atualiza as duas pernas já existentes em vez de inserir
--      pernas novas, mesma validação de moeda/valor/contas distintas.

-- -------------------------------------------------------------------------
-- 1. Bloqueia edição da transação de sistema "Saldo Inicial"
-- -------------------------------------------------------------------------
create or replace function public.validate_transaction_not_internal()
returns trigger as $$
begin
  if old.category_id is not null and exists (
    select 1
    from public.categories c
    join public.system_categories sc on sc.id = c.system_category_id
    where c.id = old.category_id and sc.is_internal
  ) then
    raise exception 'Transação de sistema (ex: Saldo Inicial) não pode ser editada.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_transaction_not_internal
  before update on public.transactions
  for each row execute function public.validate_transaction_not_internal();

-- -------------------------------------------------------------------------
-- 2. Bloqueia mudar o type para/de 'transferencia' via UPDATE comum
-- -------------------------------------------------------------------------
create or replace function public.validate_transaction_type_immutable()
returns trigger as $$
begin
  if old.type = 'transferencia' and new.type <> 'transferencia' then
    raise exception 'Uma transferência não pode virar despesa/receita — edite pela tela de transferências.';
  end if;
  if old.type <> 'transferencia' and new.type = 'transferencia' then
    raise exception 'Um lançamento comum não pode virar transferência — use a tela de transferências.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_transaction_type_immutable
  before update on public.transactions
  for each row execute function public.validate_transaction_type_immutable();

-- -------------------------------------------------------------------------
-- 3. Edição atômica de transferência (atualiza as 2 pernas já existentes)
-- -------------------------------------------------------------------------
create or replace function public.atualizar_transferencia(
  p_transfer_id uuid,
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
  v_transfer record;
  v_origin_currency text;
  v_destination_currency text;
begin
  if p_amount <= 0 then
    raise exception 'O valor da transferência deve ser positivo.';
  end if;

  if p_origin_account_id = p_destination_account_id then
    raise exception 'A conta de origem e destino não podem ser a mesma.';
  end if;

  select * into v_transfer
  from public.transfers
  where id = p_transfer_id and user_id = auth.uid();

  if not found then
    raise exception 'Transferência não encontrada ou acesso não permitido.';
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

  update public.transactions
  set account_id = p_origin_account_id,
      amount = -p_amount,
      currency = v_origin_currency,
      description = p_description,
      occurred_at = p_occurred_at,
      paid_at = p_occurred_at
  where id = v_transfer.origin_transaction_id and user_id = auth.uid();

  update public.transactions
  set account_id = p_destination_account_id,
      amount = p_amount,
      currency = v_destination_currency,
      description = p_description,
      occurred_at = p_occurred_at,
      paid_at = p_occurred_at
  where id = v_transfer.destination_transaction_id and user_id = auth.uid();

  return v_transfer.id;
end;
$$;

comment on function public.atualizar_transferencia(uuid, uuid, uuid, numeric, text, timestamptz) is
  'SECURITY INVOKER, atômica (uma única chamada = uma transação Postgres implícita, igual efetivar_transferencia): atualiza as 2 pernas já existentes em vez de inserir novas. Mesma validação de moeda/valor/contas distintas da criação.';
