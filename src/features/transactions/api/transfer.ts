import type { TransferInput } from "@/features/transactions/domain/schemas"

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
