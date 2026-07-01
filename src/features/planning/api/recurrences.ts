import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import { softDelete } from "@/shared/supabase/soft-delete"
import type { CreateRecurrenceInput } from "@/features/planning/domain/schemas"

export type RecurrenceRule =
  Database["public"]["Tables"]["recurrence_rules"]["Row"]

export async function fetchRecurrenceRules(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("recurrence_rules")
    .select("*, categories(name, icon), accounts(name, currency)")
    .is("deleted_at", null)
    .order("next_occurrence_date", { ascending: true })
  if (error) throw error
  return data
}

export async function createRecurrenceRule(
  supabase: SupabaseClient<Database>,
  input: CreateRecurrenceInput
) {
  const { data, error } = await supabase
    .from("recurrence_rules")
    .insert({
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      frequency: input.frequency,
      next_occurrence_date: input.nextOccurrenceDate,
      end_date: input.endDate ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurrenceRule(
  supabase: SupabaseClient<Database>,
  id: string
) {
  const { error } = await softDelete(supabase, "recurrence_rules", id)
  if (error) throw error
}
