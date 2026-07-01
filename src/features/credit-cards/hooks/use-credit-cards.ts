"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createClient } from "@/shared/supabase/client"
import {
  createCreditCard,
  fetchCardAvailableLimit,
  fetchCardInvoices,
  fetchCreditCards,
  fetchInvoiceTransactions,
  payInvoice,
  registerPurchase,
  type CreditCard,
} from "@/features/credit-cards/api/credit-cards"
import type {
  CreateCreditCardInput,
  PurchaseInput,
} from "@/features/credit-cards/domain/schemas"

export function useCreditCards() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["credit-cards"],
    queryFn: () => fetchCreditCards(supabase),
  })
}

export function useCardInvoices(cardId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["invoices", cardId],
    queryFn: () => fetchCardInvoices(supabase, cardId),
    enabled: Boolean(cardId),
  })
}

export function useCardAvailableLimit(cardId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["credit-cards", cardId, "limit"],
    queryFn: () => fetchCardAvailableLimit(supabase, cardId),
    enabled: Boolean(cardId),
  })
}

export function useCreateCreditCard() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCreditCardInput) =>
      createCreditCard(supabase, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
  })
}

export function useRegisterPurchase(card: CreditCard, userTimezone: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PurchaseInput) =>
      registerPurchase(supabase, card, input, userTimezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", card.id] })
      queryClient.invalidateQueries({
        queryKey: ["credit-cards", card.id, "limit"],
      })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function usePayInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      accountId,
    }: {
      invoiceId: string
      accountId: string
    }) => payInvoice(invoiceId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useInvoiceTransactions(invoiceId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["invoice-transactions", invoiceId],
    queryFn: () => fetchInvoiceTransactions(supabase, invoiceId),
    enabled: Boolean(invoiceId),
  })
}
