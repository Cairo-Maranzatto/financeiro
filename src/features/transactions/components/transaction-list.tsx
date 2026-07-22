"use client"

import Link from "next/link"

import { useTransactions } from "@/features/transactions/hooks/use-transactions"

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

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando lançamentos...</p>
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-muted-foreground">Nenhum lançamento ainda.</p>
  }

  return (
    <ul className="divide-border flex flex-col divide-y">
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <Link
            href={`/transacoes/${transaction.id}/editar`}
            className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-3"
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
          </Link>
        </li>
      ))}
    </ul>
  )
}
