"use client"

import { Dialog } from "@/shared/ui/dialog"
import { TransactionForm } from "@/features/transactions/components/transaction-form"
import { TransferForm } from "@/features/transactions/components/transfer-form"
import {
  useTransaction,
  useTransferByTransactionId,
} from "@/features/transactions/hooks/use-transactions"
import type { Currency } from "@/features/accounts/domain/schemas"

interface TransactionEditModalProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionEditModal({
  transactionId,
  open,
  onOpenChange,
}: TransactionEditModalProps) {
  const id = transactionId ?? ""
  const { data: transaction, isLoading, error } = useTransaction(id)

  const isTransfer = transaction?.type === "transferencia"
  const transferId = isTransfer ? id : ""
  const {
    data: transfer,
    isLoading: isLoadingTransfer,
    error: transferError,
  } = useTransferByTransactionId(transferId)

  function handleSuccess() {
    onOpenChange(false)
  }

  const isBusy = isLoading || (isTransfer && isLoadingTransfer)
  const hasError = error || (isTransfer && transferError)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar lançamento">
      {isBusy ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : hasError || !transaction ? (
        <p className="text-destructive text-sm">
          Não foi possível carregar este lançamento.
        </p>
      ) : transaction.is_internal ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">
              {transaction.description ?? "Esta transação"}
            </span>{" "}
            é uma transação interna do sistema e não pode ser editada.
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      ) : isTransfer ? (
        <TransferForm initial={transfer} onSuccess={handleSuccess} />
      ) : (
        <TransactionForm
          initial={{
            id: transaction.id,
            accountId: transaction.account_id!,
            categoryId: transaction.category_id!,
            type: transaction.type as "despesa" | "receita",
            amount: transaction.amount,
            currency: transaction.currency as Currency,
            description: transaction.description,
            occurredAt: transaction.occurred_at,
          }}
          onSuccess={handleSuccess}
        />
      )}
    </Dialog>
  )
}
