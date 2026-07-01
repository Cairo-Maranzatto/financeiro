import { cn } from "@/shared/lib/utils"
import type { DashboardSummary } from "@/features/dashboard/api/dashboard"

type Transaction = DashboardSummary["recentTransactions"][number]

type Props = {
  transactions: Transaction[]
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "BTC") return `${Math.abs(amount).toFixed(8)} BTC`
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Math.abs(amount)
  )
}

export function RecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma transação recente.
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {transactions.map((tx) => {
        const label = tx.description ?? tx.categories?.name ?? "—"
        const sub = tx.description ? tx.categories?.name : undefined
        const date = new Date(tx.occurred_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        })

        return (
          <li
            key={tx.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="text-muted-foreground text-xs">
                {sub ? `${sub} · ` : ""}
                {date}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold",
                tx.type === "receita"
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
              )}
            >
              {tx.type === "receita" ? "+" : "-"}
              {formatAmount(tx.amount, tx.currency)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
