"use client"

import {
  useDeleteRecurrenceRule,
  useRecurrenceRules,
} from "@/features/planning/hooks/use-planning"

const FREQUENCY_LABEL: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
}

export function RecurrenceList() {
  const { data: rules, isLoading } = useRecurrenceRules()
  const { mutate: deleteRule, isPending: isDeleting } =
    useDeleteRecurrenceRule()

  const fmt = (amount: number, currency: string) => {
    if (currency === "BTC") return `${Math.abs(amount).toFixed(8)} BTC`
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(Math.abs(amount))
  }

  const fmtDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <li
            key={i}
            className="bg-muted h-16 animate-pulse rounded-lg border"
          />
        ))}
      </ul>
    )
  }

  if (!rules || rules.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma recorrência ativa. Crie a primeira!
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {rules.map((rule) => {
        const cat = rule.categories as {
          name: string
          icon: string | null
        } | null
        const acc = rule.accounts as { name: string; currency: string } | null
        return (
          <li
            key={rule.id}
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={
                    rule.type === "receita"
                      ? "text-xs font-medium text-green-600 dark:text-green-400"
                      : "text-destructive text-xs font-medium"
                  }
                >
                  {rule.type === "receita" ? "+" : "-"}
                  {fmt(rule.amount, rule.currency)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {FREQUENCY_LABEL[rule.frequency] ?? rule.frequency}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium">
                {rule.description ?? cat?.name ?? "—"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {acc?.name} · próxima: {fmtDate(rule.next_occurrence_date)}
                {rule.end_date ? ` · até ${fmtDate(rule.end_date)}` : ""}
              </p>
            </div>
            <button
              onClick={() => deleteRule(rule.id)}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive text-xs disabled:opacity-50"
              aria-label="Cancelar recorrência"
            >
              ×
            </button>
          </li>
        )
      })}
    </ul>
  )
}
