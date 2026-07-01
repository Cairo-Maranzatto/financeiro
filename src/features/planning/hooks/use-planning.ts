"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createClient } from "@/shared/supabase/client"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { useUserSettings } from "@/features/identity/hooks/use-user-settings"
import {
  createBudget,
  deleteBudget,
  fetchBudgetsWithUsage,
} from "@/features/planning/api/budgets"
import {
  createRecurrenceRule,
  deleteRecurrenceRule,
  fetchRecurrenceRules,
} from "@/features/planning/api/recurrences"
import type {
  CreateBudgetInput,
  CreateRecurrenceInput,
} from "@/features/planning/domain/schemas"

function useFinancialMonthRange() {
  const { data: settings } = useUserSettings()
  if (!settings) return null
  const startDay = settings.financial_month_start_day
  const timezone = settings.timezone
  const nowLocal = toDateInTimezone(new Date(), timezone)
  const { start, endExclusive } = resolveFinancialMonth(nowLocal, startDay)
  return {
    startStr: toDateString(start),
    endStr: toDateString(endExclusive),
    timezone,
  }
}

export function useBudgets() {
  const supabase = createClient()
  const range = useFinancialMonthRange()

  return useQuery({
    queryKey: ["budgets", range?.startStr],
    queryFn: () =>
      fetchBudgetsWithUsage(
        supabase,
        range!.startStr,
        range!.endStr,
        range!.timezone
      ),
    enabled: Boolean(range),
    staleTime: 30_000,
  })
}

export function useCreateBudget() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useDeleteBudget() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBudget(supabase, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  })
}

export function useRecurrenceRules() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["recurrence-rules"],
    queryFn: () => fetchRecurrenceRules(supabase),
  })
}

export function useCreateRecurrenceRule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRecurrenceInput) =>
      createRecurrenceRule(supabase, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurrence-rules"] }),
  })
}

export function useDeleteRecurrenceRule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRecurrenceRule(supabase, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurrence-rules"] }),
  })
}

export { useFinancialMonthRange }
