-- =============================================================================
-- reset_user_data.sql
--
-- Apaga PERMANENTEMENTE (DELETE físico, não soft delete) todos os dados
-- transacionais de UM usuário — contas, cartões, faturas, transações,
-- transferências, orçamentos, recorrências, empréstimos e metas — deixando-o
-- como se fosse o primeiro acesso. `categories` (categorias já configuradas) e
-- `user_settings` (timezone, mês financeiro etc.) são preservados de propósito.
--
-- Este script roda fora do runtime da aplicação (SQL Editor do Supabase ou
-- `supabase db query --linked -f scripts/reset_user_data.sql`), conectado com
-- privilégio elevado — por isso ignora RLS e pode fazer DELETE físico mesmo
-- não havendo nenhuma policy de DELETE nas tabelas (o app nunca expõe essa
-- operação a usuários finais).
--
-- COMO USAR:
--   1. Troque o e-mail em v_email logo abaixo pelo do usuário a resetar.
--   2. Rode este arquivo inteiro de uma vez (é uma única transação).
--   3. Confira a saída do bloco RAISE NOTICE e o SELECT de verificação no
--      final — todas as colunas devem estar em 0, exceto "categorias_mantidas".
--   4. Por padrão o script termina com COMMIT. Para testar sem gravar nada
--      (dry run), troque a última linha de `COMMIT;` para `ROLLBACK;`, rode,
--      confira a contagem, e só depois rode de novo com COMMIT de verdade.
--
-- ATENÇÃO: ação destrutiva e irreversível (DELETE físico, não passa por
-- soft delete). Confirme o e-mail com cuidado antes de rodar.
-- =============================================================================

begin;

do $$
declare
  v_email   text := 'usuario@example.com'; -- <<< TROQUE AQUI pelo e-mail do usuário
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception 'Usuário com e-mail "%" não encontrado em auth.users.', v_email;
  end if;

  raise notice 'Resetando dados do usuário % (email %)...', v_user_id, v_email;

  -- 1. Alocações de metas (referenciam goals + transactions)
  delete from public.goal_allocations where user_id = v_user_id;

  -- 2. Parcelas de empréstimo (referenciam loans + transactions, sem user_id próprio)
  delete from public.loan_installments
  where loan_id in (select id from public.loans where user_id = v_user_id);

  -- 3. Transferências (referenciam transactions)
  delete from public.transfers where user_id = v_user_id;

  -- 4. Transações (referenciam accounts + invoices; category_id é preservado)
  delete from public.transactions where user_id = v_user_id;

  -- 5. Regras de recorrência (referenciam accounts + credit_cards)
  delete from public.recurrence_rules where user_id = v_user_id;

  -- 6. Faturas (referenciam credit_cards)
  delete from public.invoices where user_id = v_user_id;

  -- 7. Cartões de crédito (referenciam accounts via default_account_id)
  delete from public.credit_cards where user_id = v_user_id;

  -- 8. Empréstimos (referenciam accounts via default_account_id)
  delete from public.loans where user_id = v_user_id;

  -- 9. Orçamentos (referenciam categories, que são preservadas)
  delete from public.budgets where user_id = v_user_id;

  -- 10. Metas
  delete from public.goals where user_id = v_user_id;

  -- 11. Contas (por último — todas as tabelas acima referenciam accounts)
  delete from public.accounts where user_id = v_user_id;

  raise notice 'Reset concluído para o usuário % — categories e user_settings preservados.', v_user_id;
end $$;

-- -----------------------------------------------------------------------------
-- Verificação: todas as colunas abaixo devem ser 0, exceto "categorias_mantidas"
-- (que deve mostrar as categorias hierárquicas já configuradas, intactas).
-- -----------------------------------------------------------------------------
with alvo as (
  select id as user_id from auth.users where email = 'usuario@example.com' -- mesmo e-mail de cima
)
select
  (select count(*) from public.accounts          where user_id = (select user_id from alvo)) as accounts,
  (select count(*) from public.credit_cards      where user_id = (select user_id from alvo)) as credit_cards,
  (select count(*) from public.invoices          where user_id = (select user_id from alvo)) as invoices,
  (select count(*) from public.transactions      where user_id = (select user_id from alvo)) as transactions,
  (select count(*) from public.transfers         where user_id = (select user_id from alvo)) as transfers,
  (select count(*) from public.budgets           where user_id = (select user_id from alvo)) as budgets,
  (select count(*) from public.recurrence_rules  where user_id = (select user_id from alvo)) as recurrence_rules,
  (select count(*) from public.goals             where user_id = (select user_id from alvo)) as goals,
  (select count(*) from public.goal_allocations  where user_id = (select user_id from alvo)) as goal_allocations,
  (select count(*) from public.loans             where user_id = (select user_id from alvo)) as loans,
  (select count(*)
     from public.loan_installments li
     join public.loans l on l.id = li.loan_id
    where l.user_id = (select user_id from alvo)) as loan_installments,
  (select count(*) from public.categories
    where user_id = (select user_id from alvo) and deleted_at is null) as categorias_mantidas;

-- Troque para ROLLBACK; se estiver só testando (dry run).
commit;
