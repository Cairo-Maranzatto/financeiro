import type { DashboardSummary } from "@/features/dashboard/api/dashboard"

type Props = {
  indicators: DashboardSummary["indicators"]
}

function statusColor(
  value: number | null,
  { warnAt, alertAt }: { warnAt: number; alertAt: number },
  higherIsBetter: boolean
): string {
  if (value === null) return "text-muted-foreground"
  const bad = higherIsBetter ? value < warnAt : value >= alertAt
  const warn = higherIsBetter ? value < alertAt : value >= warnAt
  if (bad) return "text-red-600"
  if (warn) return "text-yellow-600"
  return "text-green-600"
}

function IndicatorCard({
  label,
  value,
  colorClassName,
  hint,
}: {
  label: string
  value: number | null
  colorClassName: string
  hint: string
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-xl font-bold ${colorClassName}`}>
        {value === null ? "—" : `${value.toFixed(1)}%`}
      </span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </div>
  )
}

export function FinancialIndicators({ indicators }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <IndicatorCard
        label="Taxa de categorização"
        value={indicators.categorizationRate}
        colorClassName={statusColor(
          indicators.categorizationRate,
          { warnAt: 90, alertAt: 75 },
          true
        )}
        hint="Meta: 100% (fora de 'Outras')"
      />
      <IndicatorCard
        label="Comprometimento com moradia"
        value={indicators.housingCommitment}
        colorClassName={statusColor(
          indicators.housingCommitment,
          { warnAt: 30, alertAt: 30 },
          false
        )}
        hint="Alerta se > 30% da receita"
      />
      <IndicatorCard
        label="Taxa de poupança"
        value={indicators.savingsRate}
        colorClassName={statusColor(
          indicators.savingsRate,
          { warnAt: 20, alertAt: 0 },
          true
        )}
        hint="Meta: ≥ 20% da receita"
      />
    </div>
  )
}
