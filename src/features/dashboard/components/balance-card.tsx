import { cn } from "@/shared/lib/utils"

type Props = {
  currency: string
  balance: number
}

function formatBalance(balance: number, currency: string): string {
  if (currency === "BTC") {
    return `${Math.abs(balance).toFixed(8)} BTC`
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Math.abs(balance)
  )
}

export function BalanceCard({ currency, balance }: Props) {
  const isNegative = balance < 0

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-medium">{currency}</p>
      <p
        className={cn(
          "text-xl leading-tight font-bold",
          isNegative && "text-destructive"
        )}
      >
        {isNegative && <span className="mr-0.5 text-base">-</span>}
        {formatBalance(balance, currency)}
      </p>
    </div>
  )
}
