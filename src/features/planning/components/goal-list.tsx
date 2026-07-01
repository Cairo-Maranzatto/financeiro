"use client"

import Link from "next/link"

import { useGoals, useDeleteGoal } from "@/features/planning/hooks/use-goals"

const STATUS_COLOR: Record<string, string> = {
  "Em andamento": "text-yellow-600",
  Concluída: "text-green-600",
  Cancelada: "text-muted-foreground",
}

export function GoalList() {
  const { data: goals, isLoading, error } = useGoals()
  const { mutate: deleteGoal, isPending: deleting } = useDeleteGoal()

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  if (error) return <p className="text-destructive text-sm">{error.message}</p>
  if (!goals?.length)
    return (
      <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada.</p>
    )

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => {
        const pct = Math.min(goal.percentage, 100)
        const barColor =
          pct >= 100
            ? "bg-green-500"
            : pct >= 80
              ? "bg-yellow-500"
              : "bg-primary"

        return (
          <li
            key={goal.id}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Link
                  href={`/metas/${goal.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {goal.name}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {Number(goal.current_amount).toFixed(
                    goal.currency === "BTC" ? 8 : 2
                  )}{" "}
                  /{" "}
                  {Number(goal.target_amount).toFixed(
                    goal.currency === "BTC" ? 8 : 2
                  )}{" "}
                  {goal.currency}
                  {goal.target_date && ` · até ${goal.target_date}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium ${STATUS_COLOR[goal.status] ?? ""}`}
                >
                  {goal.percentage.toFixed(0)}%
                </span>
                {goal.status === "Em andamento" && (
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    disabled={deleting}
                    className="text-destructive text-xs hover:underline disabled:opacity-50"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
