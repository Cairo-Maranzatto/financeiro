import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import { softDelete } from "@/shared/supabase/soft-delete"
import type { CreateBudgetInput } from "@/features/planning/domain/schemas"

export type BudgetWithUsage = {
  id: string
  category_id: string
  category_name: string
  amount_limit: number
  spent: number
  percentage: number
}

export async function fetchBudgetsWithUsage(
  supabase: SupabaseClient<Database>,
  startDate: string,
  endExclusiveDate: string,
  timezone: string
): Promise<BudgetWithUsage[]> {
  const { data, error } = await supabase.rpc("get_budgets_with_usage", {
    p_start: startDate,
    p_end_exclusive: endExclusiveDate,
    p_timezone: timezone,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    category_id: row.category_id,
    category_name: row.category_name,
    amount_limit: Number(row.amount_limit),
    spent: Number(row.spent),
    percentage: Number(row.percentage),
  }))
}

export async function createBudget(
  supabase: SupabaseClient<Database>,
  input: CreateBudgetInput
) {
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      category_id: input.categoryId,
      amount_limit: input.amountLimit,
      reference_month: input.referenceMonth,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBudget(
  supabase: SupabaseClient<Database>,
  id: string
) {
  const { error } = await softDelete(supabase, "budgets", id)
  if (error) throw error
}
