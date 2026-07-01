export type DashboardSummary = {
  balancesByCurrency: { currency: string; balance: number }[]
  monthExpenses: number
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
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch("/api/dashboard/summary")
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Falha ao carregar o dashboard.")
  }
  return response.json()
}
