"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  fetchGoals,
  fetchGoalAllocations,
  createGoal,
  allocateToGoal,
  deleteGoal,
} from "@/features/planning/api/goals"
import type {
  CreateGoalInput,
  AllocateToGoalInput,
} from "@/features/planning/domain/schemas"

export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: fetchGoals })
}

export function useGoalAllocations(goalId: string) {
  return useQuery({
    queryKey: ["goal-allocations", goalId],
    queryFn: () => fetchGoalAllocations(goalId),
    enabled: !!goalId,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  })
}

export function useAllocateToGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AllocateToGoalInput) => allocateToGoal(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["goals"] })
      qc.invalidateQueries({ queryKey: ["goal-allocations", variables.goalId] })
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  })
}
