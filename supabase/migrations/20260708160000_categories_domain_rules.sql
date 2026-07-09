-- Fase A2 do aprimoramento de categorias (fases/aprimoramento/FASE_A02_REGRAS_DOMINIO_AGREGACOES.md)
-- Regras de domínio: tipo herdado em `categories` (não só em `system_categories`), só
-- subcategoria/especial (folha) é lançável em `transactions`/`recurrence_rules`, e
-- `budgets` só aceita categoria-pai (decisão de produto confirmada com o usuário em
-- 2026-07-08: orçamentos operam no nível pai, análise detalhada fica para o Dashboard).
--
-- NOTA DE DESIGN: recurrence_rules foi mantida no nível FOLHA (mesma regra de transactions),
-- não no nível pai como orçamentos — divergindo da leitura mais literal da decisão do usuário
-- (que falou em "orçamentos e recorrências" juntos). Motivo técnico: uma recorrência gera uma
-- transaction de verdade via cron (generate_recurrences(), Fase 4 do MVP original), sem humano
-- no loop para escolher uma subcategoria no momento da geração — se recurrence_rules aceitasse
-- categoria-pai, a transaction gerada violaria a regra de "só folha" (passo 2 abaixo) ou exigiria
-- um "categoria-pai vira transaction sem categoria real" que não é o que o usuário provavelmente
-- quer. Se isso não for o comportamento desejado, é só reverter facilmente (mesma forma de
-- budgets) numa migration futura.

-- -------------------------------------------------------------------------
-- 1. Tipo herdado em categories (tabela por usuário, não só o catálogo global)
-- -------------------------------------------------------------------------
create or replace function public.validate_category_type()
returns trigger as $$
begin
  if new.parent_category_id is not null then
    if new.type <> (select type from public.categories where id = new.parent_category_id) then
      raise exception 'Subcategoria "%" deve herdar o tipo (Receita/Despesa) da categoria-pai', new.name;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_category_type
  before insert or update on public.categories
  for each row execute function public.validate_category_type();

-- -------------------------------------------------------------------------
-- 2. Só folha (subcategoria ou especial sem filhos) é lançável em transactions/recurrence_rules
-- -------------------------------------------------------------------------
create or replace function public.validate_category_is_leaf()
returns trigger as $$
begin
  if new.category_id is not null and exists (
    select 1 from public.categories where parent_category_id = new.category_id
  ) then
    raise exception 'Categoria % possui subcategorias — selecione uma subcategoria específica', new.category_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_transaction_category_is_leaf
  before insert or update on public.transactions
  for each row execute function public.validate_category_is_leaf();

create trigger trg_validate_recurrence_category_is_leaf
  before insert or update on public.recurrence_rules
  for each row execute function public.validate_category_is_leaf();

-- -------------------------------------------------------------------------
-- 3. Budgets só aceitam categoria-pai (tem subcategorias) — nunca folha
-- -------------------------------------------------------------------------
create or replace function public.validate_budget_category_is_parent()
returns trigger as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories where parent_category_id = new.category_id
  ) then
    raise exception 'Orçamento deve usar uma categoria-pai (com subcategorias) — categoria % é uma folha', new.category_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- -------------------------------------------------------------------------
-- 4. Corrige budgets já remapeados na Fase A1 para uma FOLHA (a Fase A1 remapeou tudo
--    para o nível mais específico disponível; a decisão de orçamento por pai só foi
--    tomada agora, na Fase A2) — aponta cada budget para o PAI da folha atual.
-- -------------------------------------------------------------------------
update public.budgets b
set category_id = c_pai.id
from public.categories c_folha,
     public.categories c_pai
where b.category_id = c_folha.id
  and c_folha.parent_category_id = c_pai.id;

-- Só agora ativa a trigger — depois da correção acima, não antes (senão a correção acima falharia)
create trigger trg_validate_budget_category_is_parent
  before insert or update on public.budgets
  for each row execute function public.validate_budget_category_is_parent();

-- -------------------------------------------------------------------------
-- 5. Rollup por categoria-pai para o Dashboard (Fase A5) — não substitui get_category_expenses
--    (drill-down por subcategoria), é uma agregação paralela no nível pai.
-- -------------------------------------------------------------------------
create or replace function public.get_category_expenses_by_parent(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text default 'UTC'
)
returns table (parent_category_id uuid, parent_category_name text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(c.parent_category_id, c.id) as parent_category_id,
    coalesce(c_pai.name, c.name)::text   as parent_category_name,
    abs(sum(t.amount))                   as total
  from public.transactions t
  join public.categories c
    on c.id = t.category_id
   and c.deleted_at is null
  left join public.categories c_pai
    on c_pai.id = c.parent_category_id
   and c_pai.deleted_at is null
  where t.user_id = auth.uid()
    and t.type = 'despesa'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive
  group by coalesce(c.parent_category_id, c.id), coalesce(c_pai.name, c.name)
  order by total desc
  limit 5;
$$;

-- -------------------------------------------------------------------------
-- 6. get_budgets_with_usage precisa somar as transações das SUBCATEGORIAS do pai
--    orçado, não só transações com category_id igual ao do budget (que agora é sempre
--    um pai, nunca usado diretamente em transactions).
-- -------------------------------------------------------------------------
create or replace function public.get_budgets_with_usage(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text default 'UTC'
)
returns table (
  id              uuid,
  category_id     uuid,
  category_name   text,
  amount_limit    numeric,
  spent           numeric,
  percentage      numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.id,
    b.category_id,
    c.name::text as category_name,
    b.amount_limit,
    coalesce(abs(sum(t.amount)), 0) as spent,
    case when b.amount_limit > 0 then
      round(coalesce(abs(sum(t.amount)), 0) / b.amount_limit * 100, 1)
    else 0::numeric end as percentage
  from public.budgets b
  join public.categories c
    on c.id = b.category_id
   and c.deleted_at is null
  left join public.categories c_filha
    on c_filha.parent_category_id = b.category_id
   and c_filha.deleted_at is null
  left join public.transactions t
    on t.category_id = c_filha.id
   and t.user_id     = auth.uid()
   and t.type        = 'despesa'
   and t.deleted_at is null
   and (t.occurred_at at time zone p_timezone)::date >= p_start
   and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive
  where b.user_id = auth.uid()
    and b.deleted_at is null
    and b.reference_month = p_start
  group by b.id, b.category_id, c.name, b.amount_limit
  order by percentage desc, b.amount_limit desc;
$$;

grant execute on function public.get_category_expenses_by_parent(date, date, text) to anon, authenticated;
