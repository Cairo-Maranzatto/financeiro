"use client"

import { useState } from "react"

import { useTransactions } from "@/features/transactions/hooks/use-transactions"
import { TransactionEditModal } from "@/features/transactions/components/transaction-edit-modal"

function formatMoney(amount: number, currency: string) {
  if (currency === "BTC") return `${amount.toFixed(8)} BTC`
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    amount
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value)
  )
}

export function TransactionList({ accountId }: { accountId?: string }) {
  const { data: transactions, isLoading } = useTransactions(accountId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando lançamentos...</p>
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-muted-foreground">Nenhum lançamento ainda.</p>
  }

  return (
    <>
      <ul className="divide-border flex flex-col divide-y">
        {transactions.map((transaction) => (
          <li key={transaction.id}>
            <button
              type="button"
              onClick={() => {
                setEditingId(transaction.id)
                setIsOpen(true)
              }}
              className="hover:bg-muted/50 -mx-2 flex w-full items-center justify-between rounded-md px-2 py-3 text-left"
            >
              <div>
                <p className="font-medium">
                  {transaction.description || transaction.type}
                </p>
                <p className="text-muted-foreground text-sm">
                  {formatDate(transaction.occurred_at)} · {transaction.status}
                </p>
              </div>
              <p
                className={
                  transaction.amount < 0
                    ? "text-destructive font-medium"
                    : "font-medium"
                }
              >
                {formatMoney(transaction.amount, transaction.currency)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <TransactionEditModal
        transactionId={editingId}
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditingId(null)
        }}
      />
    </>
  )
}
