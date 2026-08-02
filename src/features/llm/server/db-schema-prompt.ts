export const DB_SCHEMA_PROMPT = `Tabelas principais (RLS ativo: filtre user_id = auth.uid() e deleted_at IS NULL):

accounts(id uuid, user_id uuid, name text, currency text)
categories(id uuid, user_id uuid, name text, type text, parent_category_id uuid)
transactions(id uuid, user_id uuid, account_id uuid, category_id uuid, type text, status text, amount numeric, currency text, description text, occurred_at timestamptz)
credit_cards(id uuid, user_id uuid, name text, limit numeric)
invoices(id uuid, user_id uuid, credit_card_id uuid, due_date date, status text, total numeric)
budgets(id uuid, user_id uuid, category_id uuid, amount_limit numeric, reference_month date)
user_settings(id uuid, timezone text)

Regras:
- Apenas SELECT; comece com SELECT.
- Filtre user_id = auth.uid() e deleted_at IS NULL.
- Despesas: amount < 0; receitas: amount > 0.`
