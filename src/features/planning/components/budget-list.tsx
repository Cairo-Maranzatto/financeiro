"use client"

import { cn } from "@/shared/lib/utils"
import {
  useBudgets,
  useDeleteBudget,
} from "@/features/planning/hooks/use-planning"

function progressColor(percentage: number): string {
  if (percentage >= 100) return "bg-destructive"
  if (percentage >= 80) return "bg-yellow-500"
  return "bg-green-500"
}

function progressTextColor(percentage: number): string {
  if (percentage >= 100) return "text-destructive"
  if (percentage >= 80) return "text-yellow-600 dark:text-yellow-400"
  return "text-green-600 dark:text-green-400"
}

export function BudgetList() {
  const { data: budgets, isLoading } = useBudgets()
  const { mutate: deleteBudget, isPending: isDeleting } = useDeleteBudget()

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v)

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <li
            key={i}
            className="bg-muted h-20 animate-pulse rounded-lg border"
          />
        ))}
      </ul>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum orçamento cadastrado para este mês. Crie o primeiro!
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {budgets.map((budget) => {
        const pct = Math.min(budget.percentage, 100)
        const isOver = budget.percentage >= 100
        const isWarning = budget.percentage >= 80 && budget.percentage < 100

        return (
          <li
            key={budget.id}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{budget.category_name}</p>
                <p className="text-muted-foreground text-xs">
                  {fmt(budget.spent)} de {fmt(budget.amount_limit)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    progressTextColor(budget.percentage)
                  )}
                >
                  {budget.percentage.toFixed(0)}%{isOver && " ⚠"}
                  {isWarning && " !"}
                </span>
                <button
                  onClick={() => deleteBudget(budget.id)}
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-destructive text-xs disabled:opacity-50"
                  aria-label="Remover orçamento"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  progressColor(budget.percentage)
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
