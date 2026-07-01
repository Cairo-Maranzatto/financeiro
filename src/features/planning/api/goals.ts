import { createClient } from "@/shared/supabase/client"
import type {
  CreateGoalInput,
  AllocateToGoalInput,
} from "@/features/planning/domain/schemas"

export type GoalRow = {
  id: string
  name: string
  target_amount: number
  currency: string
  target_date: string | null
  status: string
  created_at: string
}

export type GoalWithProgress = GoalRow & {
  current_amount: number
  percentage: number
}

export type GoalAllocationRow = {
  id: string
  goal_id: string
  amount: number
  note: string | null
  transaction_id: string | null
  created_at: string
}

export async function fetchGoals(): Promise<GoalWithProgress[]> {
  const supabase = createClient()
  const { data: goals, error: gErr } = await supabase
    .from("goals")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (gErr) throw new Error(gErr.message)
  if (!goals || goals.length === 0) return []

  const { data: allocs, error: aErr } = await supabase
    .from("goal_allocations")
    .select("goal_id, amount")
    .in(
      "goal_id",
      goals.map((g) => g.id)
    )

  if (aErr) throw new Error(aErr.message)

  return goals.map((g) => {
    const current = (allocs ?? [])
      .filter((a) => a.goal_id === g.id)
      .reduce((s, a) => s + Number(a.amount), 0)
    const pct = g.target_amount > 0 ? (current / g.target_amount) * 100 : 0
    return {
      ...g,
      current_amount: current,
      percentage: parseFloat(pct.toFixed(1)),
    } as GoalWithProgress
  })
}

export async function fetchGoalAllocations(
  goalId: string
): Promise<GoalAllocationRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("goal_allocations")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as GoalAllocationRow[]
}

export async function createGoal(input: CreateGoalInput): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("goals")
    .insert({
      name: input.name,
      target_amount: input.targetAmount,
      currency: input.currency,
      target_date: input.targetDate ?? null,
      status: "Em andamento",
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function allocateToGoal(
  input: AllocateToGoalInput
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("alocar_recurso_na_meta", {
    p_goal_id: input.goalId,
    p_amount: input.amount,
    p_account_id: input.accountId ?? undefined,
    p_note: input.note ?? undefined,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
}
