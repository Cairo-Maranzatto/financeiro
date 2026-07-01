"use client"

import { useGoalAllocations } from "@/features/planning/hooks/use-goals"

export function GoalAllocationsList({ goalId }: { goalId: string }) {
  const { data, isLoading, error } = useGoalAllocations(goalId)

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  if (error) return <p className="text-destructive text-sm">{error.message}</p>
  if (!data?.length)
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum aporte registrado ainda.
      </p>
    )

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Histórico de aportes</h2>
      <ul className="flex flex-col gap-2">
        {data.map((alloc) => (
          <li
            key={alloc.id}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {alloc.note ??
                  (alloc.transaction_id ? "Aporte via conta" : "Aporte manual")}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(alloc.created_at).toLocaleDateString("pt-BR")}
                {alloc.transaction_id && " · Conta debitada"}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              +{Number(alloc.amount).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
