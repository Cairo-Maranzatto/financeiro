export type FinancialIndicators = {
  categorizationRate: number | null
  housingCommitment: number | null
  savingsRate: number | null
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

export function computeFinancialIndicators({
  monthExpenses,
  monthIncome,
  housingTotal,
  uncategorizedTotal,
}: {
  monthExpenses: number
  monthIncome: number
  housingTotal: number
  uncategorizedTotal: number
}): FinancialIndicators {
  const categorizationRate = percentage(
    monthExpenses - uncategorizedTotal,
    monthExpenses
  )

  return {
    categorizationRate:
      categorizationRate === null ? null : Math.max(0, categorizationRate),
    housingCommitment: percentage(housingTotal, monthIncome),
    savingsRate: percentage(monthIncome - monthExpenses, monthIncome),
  }
}
