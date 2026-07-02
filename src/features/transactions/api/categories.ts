import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import { softDelete } from "@/shared/supabase/soft-delete"
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/features/transactions/domain/schemas"

export type Category = Database["public"]["Tables"]["categories"]["Row"]

export async function fetchCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error
  return data
}

export async function createCategory(
  supabase: SupabaseClient<Database>,
  input: CreateCategoryInput
) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, type: input.type })
    .select("id")
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  supabase: SupabaseClient<Database>,
  input: UpdateCategoryInput
) {
  const { error } = await supabase
    .from("categories")
    .update({ name: input.name, type: input.type })
    .eq("id", input.id)

  if (error) throw error
}

export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  id: string
) {
  const { error } = await softDelete(supabase, "categories", id)
  if (error) throw error
}
