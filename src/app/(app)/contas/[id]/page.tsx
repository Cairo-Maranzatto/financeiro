"use client"

import { use } from "react"
import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import {
  useAccountBalance,
  useAccounts,
} from "@/features/accounts/hooks/use-accounts"
import { TransactionList } from "@/features/transactions/components/transaction-list"

function formatMoney(amount: number, currency: string) {
  if (currency === "BTC") return `${amount.toFixed(8)} BTC`
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    amount
  )
}

export default function ContaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: accounts } = useAccounts()
  const { data: balance } = useAccountBalance(id)
  const account = accounts?.find((item) => item.id === id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{account?.name ?? "Conta"}</h1>
          <p className="text-muted-foreground text-2xl font-semibold">
            {account && balance !== undefined
              ? formatMoney(balance, account.currency)
              : "..."}
          </p>
        </div>
        <Link
          href={`/transacoes/nova?accountId=${id}`}
          className={cn(buttonVariants())}
        >
          Novo lançamento
        </Link>
      </div>
      <TransactionList accountId={id} />
    </div>
  )
}
