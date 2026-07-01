import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { buildInstallments } from "@/features/credit-cards/domain/invoice-resolver"
import type {
  CreateCreditCardInput,
  PurchaseInput,
} from "@/features/credit-cards/domain/schemas"

export type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"]
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"]

export async function fetchCreditCards(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

export async function fetchCardInvoices(
  supabase: SupabaseClient<Database>,
  cardId: string
) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("credit_card_id", cardId)
    .order("reference_month", { ascending: false })
  if (error) throw error
  return data
}

export async function fetchCardAvailableLimit(
  supabase: SupabaseClient<Database>,
  cardId: string
) {
  const { data, error } = await supabase.rpc("get_card_available_limit", {
    p_card_id: cardId,
  })
  if (error) throw error
  return data
}

export async function createCreditCard(
  supabase: SupabaseClient<Database>,
  input: CreateCreditCardInput
) {
  const { data, error } = await supabase
    .from("credit_cards")
    .insert({
      name: input.name,
      credit_limit: input.creditLimit,
      closing_day: input.closingDay,
      due_day: input.dueDay,
      default_account_id: input.defaultAccountId ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function registerPurchase(
  supabase: SupabaseClient<Database>,
  card: Pick<CreditCard, "id" | "closing_day" | "due_day">,
  input: PurchaseInput,
  userTimezone: string
) {
  const purchaseDateLocal = toDateInTimezone(
    new Date(input.purchaseDate),
    userTimezone
  )
  const installments = buildInstallments(
    purchaseDateLocal,
    input.totalAmount,
    input.currency,
    input.installments,
    { closingDay: card.closing_day, dueDay: card.due_day }
  )

  // Garantir que todas as faturas existem no banco antes de inserir transactions
  const invoiceMap = new Map<string, string>() // key: referenceMonth ISO → invoice id
  for (const installment of installments) {
    const key = installment.referenceMonth.toISOString().slice(0, 10)
    if (!invoiceMap.has(key)) {
      const { data, error } = await supabase.rpc("get_or_create_invoice", {
        p_card_id: card.id,
        p_reference_month: key,
        p_closing_date: installment.closingDate.toISOString().slice(0, 10),
        p_due_date: installment.dueDate.toISOString().slice(0, 10),
      })
      if (error) throw error
      invoiceMap.set(key, data as string)
    }
  }

  const installmentsPayload = installments.map((inst) => {
    const key = inst.referenceMonth.toISOString().slice(0, 10)
    return {
      invoice_id: invoiceMap.get(key)!,
      amount: inst.amount,
      currency: inst.currency,
      occurred_at: inst.occurredAt.toISOString(),
    }
  })

  const { error } = await supabase.rpc("registrar_compra_cartao", {
    p_installments: installmentsPayload,
    p_category_id: input.categoryId,
    p_description: input.description,
  })
  if (error) throw error
}

export async function payInvoice(invoiceId: string, accountId: string) {
  const response = await fetch("/api/credit-cards/pay-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, accountId }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Não foi possível pagar a fatura.")
  }
  return response.json()
}

export async function fetchInvoiceTransactions(
  supabase: SupabaseClient<Database>,
  invoiceId: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("occurred_at", { ascending: false })
  if (error) throw error
  return data
}
