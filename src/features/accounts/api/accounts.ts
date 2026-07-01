import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import type { CreateAccountInput } from "@/features/accounts/domain/schemas"

export type Account = Database["public"]["Tables"]["accounts"]["Row"]

export async function fetchAccounts(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) throw error
  return data
}

export async function fetchAccountBalance(
  supabase: SupabaseClient<Database>,
  accountId: string
) {
  const { data, error } = await supabase.rpc("get_account_balance", {
    p_account_id: accountId,
  })

  if (error) throw error
  return data
}

export async function createAccount(
  supabase: SupabaseClient<Database>,
  input: CreateAccountInput
) {
  const { data, error } = await supabase.rpc(
    "create_account_with_initial_balance",
    {
      p_name: input.name,
      p_currency: input.currency,
      p_icon: input.icon,
      p_color: input.color,
      p_initial_balance: input.initialBalance,
      p_occurred_at: new Date(input.occurredAt).toISOString(),
    }
  )

  if (error) throw error
  return data
}
