export const DB_SCHEMA_PROMPT = `Schema do banco de dados (apenas tabelas relevantes para leitura).
Todas as tabelas possuem RLS ativo: um usuário só vê suas próprias linhas (user_id = auth.uid() e deleted_at IS NULL, salvo indicação).

accounts
- id: uuid (PK)
- user_id: uuid
- name: text
- currency: text (BRL, USD, BTC)
- icon: text | null
- color: text | null
- created_at, updated_at, deleted_at: timestamptz

categories
- id: uuid (PK)
- user_id: uuid
- name: text
- type: text (Receita, Despesa, Ambas)
- system_category_id: uuid | null (referência interna)
- parent_category_id: uuid | null (auto-referência: categoria-pai)
- icon: text | null
- created_at, updated_at, deleted_at: timestamptz

transactions
- id: uuid (PK)
- user_id: uuid
- account_id: uuid | null (FK accounts)
- invoice_id: uuid | null (FK invoices, usado para compras parceladas)
- category_id: uuid | null (FK categories)
- type: text (receita, despesa, transferencia)
- status: text (Pendente, Pago, Vencido, Cancelado)
- amount: numeric
- currency: text (BRL, USD, BTC)
- description: text | null
- occurred_at: timestamptz
- paid_at: timestamptz | null
- created_at, updated_at, deleted_at: timestamptz
- Regra: receita > 0, despesa < 0; transferência gera duas transações (saída < 0, entrada > 0).

budgets
- id: uuid (PK)
- user_id: uuid
- category_id: uuid (FK categories, sempre categoria-pai)
- amount_limit: numeric
- reference_month: date (primeiro dia do mês financeiro)
- created_at, updated_at, deleted_at: timestamptz

credit_cards
- id: uuid (PK)
- user_id: uuid
- name: text
- limit: numeric | null
- closing_day: int
- due_day: int
- created_at, updated_at, deleted_at: timestamptz

invoices
- id: uuid (PK)
- user_id: uuid
- credit_card_id: uuid (FK credit_cards)
- due_date: date
- status: text (Aberta, Fechada, Paga, Vencida)
- total: numeric
- created_at, updated_at, deleted_at: timestamptz

user_settings
- id: uuid (PK, igual a auth.users.id)
- financial_month_start_day: int
- timezone: text
- created_at, updated_at: timestamptz

Instruções:
- Gere apenas SELECTs.
- Sempre filtre por user_id = auth.uid() e deleted_at IS NULL.
- Use JOINs com a tabela correspondente quando necessário.
- Para agregações, use COALESCE(..., 0) quando o resultado for usado em cálculos.
- Para datas, converta para o timezone do usuário (user_settings.timezone) e considere o dia de início do mês financeiro quando relevante.`
