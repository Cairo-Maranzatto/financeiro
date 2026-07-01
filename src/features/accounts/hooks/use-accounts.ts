"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createClient } from "@/shared/supabase/client"
import {
  createAccount,
  fetchAccountBalance,
  fetchAccounts,
} from "@/features/accounts/api/accounts"
import type { CreateAccountInput } from "@/features/accounts/domain/schemas"

export function useAccounts() {
  const supabase = createClient()

  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts(supabase),
  })
}

export function useAccountBalance(accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["accounts", accountId, "balance"],
    queryFn: () => fetchAccountBalance(supabase, accountId),
    enabled: Boolean(accountId),
  })
}

export function useCreateAccount() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}
