import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/features/transactions/domain/schemas"

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type TransactionWithFlags = Transaction & { is_internal: boolean }

export async function fetchTransactions(
  supabase: SupabaseClient<Database>,
  accountId?: string
) {
  let query = supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false })

  if (accountId) {
    query = query.eq("account_id", accountId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchTransactionById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<TransactionWithFlags> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(system_categories(is_internal))")
    .eq("id", id)
    .single()

  if (error) throw error

  const { categories, ...transaction } = data
  return {
    ...transaction,
    is_internal: categories?.system_categories?.is_internal ?? false,
  }
}

export async function createTransaction(
  supabase: SupabaseClient<Database>,
  input: CreateTransactionInput
) {
  const signedAmount =
    input.type === "despesa" ? -Math.abs(input.amount) : Math.abs(input.amount)
  const occurredAt = new Date(input.occurredAt).toISOString()

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      status: "Pago",
      amount: signedAmount,
      currency: input.currency,
      description: input.description ?? null,
      occurred_at: occurredAt,
      paid_at: occurredAt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTransaction(
  supabase: SupabaseClient<Database>,
  input: UpdateTransactionInput
) {
  const signedAmount =
    input.type === "despesa" ? -Math.abs(input.amount) : Math.abs(input.amount)
  const occurredAt = new Date(input.occurredAt).toISOString()

  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: signedAmount,
      currency: input.currency,
      description: input.description ?? null,
      occurred_at: occurredAt,
      paid_at: occurredAt,
    })
    .eq("id", input.id)
    .select()
    .single()

  if (error) throw error
  return data
}
