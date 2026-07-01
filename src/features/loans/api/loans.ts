import { createClient } from "@/shared/supabase/client"
import type { LoanInstallment } from "@/features/loans/domain/loan-calculator"
import type { CreateLoanInput } from "@/features/loans/domain/schemas"

export type LoanRow = {
  id: string
  name: string
  principal_amount: number
  interest_rate: number
  installments_count: number
  currency: string
  status: string
  default_account_id: string | null
  created_at: string
  accounts: { name: string } | null
}

export type LoanInstallmentRow = {
  id: string
  loan_id: string
  installment_number: number
  amount: number
  due_date: string
  status: string
  transaction_id: string | null
}

export type LoanDetail = LoanRow & {
  loan_installments: LoanInstallmentRow[]
}

export async function fetchLoans(): Promise<LoanRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("loans")
    .select("*, accounts(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as LoanRow[]
}

export async function fetchLoanDetail(id: string): Promise<LoanDetail> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("loans")
    .select("*, accounts(name), loan_installments(*)")
    .is("deleted_at", null)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  return data as LoanDetail
}

export async function createLoan(
  input: CreateLoanInput,
  installments: LoanInstallment[]
): Promise<string> {
  const res = await fetch("/api/loans/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, installments }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? "Erro ao criar empréstimo.")
  }
  const { id } = await res.json()
  return id as string
}

export async function deleteLoan(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("loans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function payInstallment(
  installmentId: string,
  accountId: string
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("pagar_parcela_emprestimo", {
    p_installment_id: installmentId,
    p_account_id: accountId,
  })
  if (error) throw new Error(error.message)
  return data as string
}
