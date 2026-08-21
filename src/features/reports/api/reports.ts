import { ReportFilters } from "../domain/schemas"

export type ReportData = {
  totals: {
    currency: string
    income: number
    expense: number
    net: number
  }[]
  categoriesIncome: {
    category_id: string
    category_name: string
    total: number
  }[]
  categoriesExpense: {
    category_id: string
    category_name: string
    total: number
  }[]
  trend: {
    period: string
    currency: string
    income: number
    expense: number
  }[]
  transactions: {
    id: string
    amount: number
    currency: string
    type: string
    status: string
    description: string | null
    occurred_at: string
    category_id: string | null
    categories: {
      name: string
      icon: string | null
      parent_category_id: string | null
    } | null
    accounts: { name: string } | null
  }[]
  filters: ReportFilters
}

export async function fetchReportData(
  filters: ReportFilters
): Promise<ReportData> {
  const params = new URLSearchParams()
  params.set("start", filters.start)
  params.set("endExclusive", filters.endExclusive)
  params.set("timezone", filters.timezone)
  if (filters.currency) params.set("currency", filters.currency)
  params.set("categoryLevel", filters.categoryLevel)
  params.set("trendInterval", filters.trendInterval)
  if (filters.accountId) params.set("accountId", filters.accountId)

  const response = await fetch(`/api/reports?${params.toString()}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Falha ao carregar relatório.")
  }

  return response.json()
}
