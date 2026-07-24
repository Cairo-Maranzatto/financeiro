export type DashboardSummary = {
  balancesByCurrency: { currency: string; balance: number }[]
  monthExpenses: number
  monthIncome: number
  projectedExpenses: number
  projectedIncome: number
  projectedNetEndOfPeriod: number
  operationalResult: number
  topCategories: { category_id: string; category_name: string; total: number }[]
  categoryDrilldown: {
    parent_category_id: string
    parent_category_name: string
    total: number
    subcategories: {
      category_id: string
      category_name: string
      total: number
    }[]
  }[]
  cashflowTrend: {
    date: string
    label: string
    income_realized_acc: number
    expense_realized_acc: number
    expense_projected_acc: number
  }[]
  alerts: {
    id: string
    severity: "danger" | "warning" | "info"
    title: string
    message: string
  }[]
  recentTransactions: {
    id: string
    amount: number
    currency: string
    type: string
    status: string
    description: string | null
    occurred_at: string
    categories: { name: string; icon: string | null } | null
  }[]
  periodStart: string
  periodEnd: string
  indicators: {
    /** % de despesas fora de "Outras/Não Categorizado" no mês. null se não houver despesas. */
    categorizationRate: number | null
    /** Moradia ÷ Receitas do mês, em %. null se não houver receita no mês. */
    housingCommitment: number | null
    /** (Receitas − Despesas) ÷ Receitas do mês, em %. null se não houver receita no mês. */
    savingsRate: number | null
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch("/api/dashboard/summary")
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Falha ao carregar o dashboard.")
  }
  return response.json()
}
