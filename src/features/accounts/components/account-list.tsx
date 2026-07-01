"use client"

import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import {
  useAccountBalance,
  useAccounts,
} from "@/features/accounts/hooks/use-accounts"
import type { Account } from "@/features/accounts/api/accounts"

function formatMoney(amount: number, currency: string) {
  if (currency === "BTC") return `${amount.toFixed(8)} BTC`
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    amount
  )
}

function AccountCard({ account }: { account: Account }) {
  const { data: balance, isLoading } = useAccountBalance(account.id)

  return (
    <Link href={`/contas/${account.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <CardTitle>{account.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading || balance === undefined
              ? "..."
              : formatMoney(balance, account.currency)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function AccountList() {
  const { data: accounts, isLoading } = useAccounts()

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando contas...</p>
  }

  if (!accounts || accounts.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nenhuma conta cadastrada ainda. Crie a primeira para começar.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}
