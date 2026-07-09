export type DashboardSummary = {
  balancesByCurrency: { currency: string; balance: number }[]
  monthExpenses: number
  monthIncome: number
  topCategories: { category_id: string; category_name: string; total: number }[]
  recentTransactions: {
    id: string
    amount: number
    currency: string
    type: string
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
