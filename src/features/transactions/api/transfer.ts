import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import type {
  TransferInput,
  UpdateTransferInput,
} from "@/features/transactions/domain/schemas"

export type TransferDetails = {
  transferId: string
  originAccountId: string
  destinationAccountId: string
  amount: number
  description: string | null
  occurredAt: string
}

export async function transferBetweenAccounts(input: TransferInput) {
  const response = await fetch("/api/transactions/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Não foi possível concluir a transferência.")
  }

  return response.json() as Promise<{ transferId: string }>
}

export async function updateTransfer(input: UpdateTransferInput) {
  const response = await fetch("/api/transactions/transfer", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error ?? "Não foi possível atualizar a transferência."
    )
  }

  return response.json() as Promise<{ transferId: string }>
}

/**
 * Dado o id de uma das duas pernas (transactions.id) de uma transferência,
 * resolve os detalhes editáveis (conta de origem/destino, valor, descrição, data).
 */
export async function fetchTransferByTransactionId(
  supabase: SupabaseClient<Database>,
  transactionId: string
): Promise<TransferDetails> {
  const { data: transfer, error: transferError } = await supabase
    .from("transfers")
    .select("*")
    .or(
      `origin_transaction_id.eq.${transactionId},destination_transaction_id.eq.${transactionId}`
    )
    .single()

  if (transferError) throw transferError

  const { data: legs, error: legsError } = await supabase
    .from("transactions")
    .select("*")
    .in("id", [
      transfer.origin_transaction_id,
      transfer.destination_transaction_id,
    ])

  if (legsError) throw legsError

  const origin = legs.find((t) => t.id === transfer.origin_transaction_id)
  const destination = legs.find(
    (t) => t.id === transfer.destination_transaction_id
  )

  if (!origin || !destination)
    throw new Error("Pernas da transferência não encontradas.")

  return {
    transferId: transfer.id,
    originAccountId: origin.account_id!,
    destinationAccountId: destination.account_id!,
    amount: Math.abs(origin.amount),
    description: origin.description,
    occurredAt: origin.occurred_at,
  }
}
