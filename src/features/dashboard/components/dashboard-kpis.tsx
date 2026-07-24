import type { DashboardSummary } from "@/features/dashboard/api/dashboard"
import { cn } from "@/shared/lib/utils"

type Props = {
  summary: Pick<
    DashboardSummary,
    | "monthIncome"
    | "monthExpenses"
    | "projectedIncome"
    | "projectedExpenses"
    | "projectedNetEndOfPeriod"
    | "operationalResult"
    | "indicators"
  >
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function KpiCard({
  label,
  value,
  helper,
  helperTone = "neutral",
}: {
  label: string
  value: string
  helper: string
  helperTone?: "neutral" | "success" | "warning" | "danger"
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p
        className={cn(
          "mt-2 text-xs",
          helperTone === "neutral" && "text-muted-foreground",
          helperTone === "success" && "text-green-600 dark:text-green-400",
          helperTone === "warning" && "text-yellow-600 dark:text-yellow-400",
          helperTone === "danger" && "text-red-600 dark:text-red-400"
        )}
      >
        {helper}
      </p>
    </div>
  )
}

export function DashboardKpis({ summary }: Props) {
  const savingsRate = summary.indicators.savingsRate

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Entradas do mês"
        value={fmtCurrency(summary.monthIncome)}
        helper={`+ ${fmtCurrency(summary.projectedIncome)} pendentes`}
        helperTone="success"
      />

      <KpiCard
        label="Saídas do mês"
        value={fmtCurrency(summary.monthExpenses)}
        helper={`+ ${fmtCurrency(summary.projectedExpenses)} projetadas`}
        helperTone={summary.projectedExpenses > 0 ? "warning" : "neutral"}
      />

      <KpiCard
        label="Resultado operacional"
        value={fmtCurrency(summary.operationalResult)}
        helper={`Projeção fim do período: ${fmtCurrency(summary.projectedNetEndOfPeriod)}`}
        helperTone={summary.operationalResult >= 0 ? "success" : "danger"}
      />

      <KpiCard
        label="Taxa de poupança"
        value={savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}
        helper="Meta recomendada: ≥ 20%"
        helperTone={
          savingsRate === null
            ? "neutral"
            : savingsRate >= 20
              ? "success"
              : "warning"
        }
      />
    </div>
  )
}
