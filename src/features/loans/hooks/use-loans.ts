"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  fetchLoans,
  fetchLoanDetail,
  createLoan,
  deleteLoan,
  updateLoan,
  payInstallment,
} from "@/features/loans/api/loans"
import type { LoanInstallment } from "@/features/loans/domain/loan-calculator"
import type {
  CreateLoanInput,
  UpdateLoanInput,
} from "@/features/loans/domain/schemas"

export function useLoans() {
  return useQuery({ queryKey: ["loans"], queryFn: fetchLoans })
}

export function useLoanDetail(id: string) {
  return useQuery({
    queryKey: ["loans", id],
    queryFn: () => fetchLoanDetail(id),
    enabled: !!id,
  })
}

export function useCreateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      installments,
    }: {
      input: CreateLoanInput
      installments: LoanInstallment[]
    }) => createLoan(input, installments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useDeleteLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function useUpdateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLoanInput }) =>
      updateLoan(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      qc.invalidateQueries({ queryKey: ["loans", id] })
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}

export function usePayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      installmentId,
      accountId,
    }: {
      installmentId: string
      accountId: string
    }) => payInstallment(installmentId, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}
