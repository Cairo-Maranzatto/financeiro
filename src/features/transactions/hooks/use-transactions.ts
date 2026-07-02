"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createClient } from "@/shared/supabase/client"
import {
  createTransaction,
  fetchTransactions,
} from "@/features/transactions/api/transactions"
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/transactions/api/categories"
import { transferBetweenAccounts } from "@/features/transactions/api/transfer"
import type {
  CreateTransactionInput,
  TransferInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/features/transactions/domain/schemas"

export function useTransactions(accountId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["transactions", accountId ?? "all"],
    queryFn: () => fetchTransactions(supabase, accountId),
  })
}

export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(supabase),
  })
}

export function useCreateTransaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      createTransaction(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TransferInput) => transferBetweenAccounts(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useCreateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useUpdateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => updateCategory(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

export function useDeleteCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCategory(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}
