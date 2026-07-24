import { NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { computeFinancialIndicators } from "@/shared/domain/financial-indicators"

type TrendPoint = {
  date: string
  label: string
  income_realized_acc: number
  expense_realized_acc: number
  expense_projected_acc: number
}

type AlertItem = {
  id: string
  severity: "danger" | "warning" | "info"
  title: string
  message: string
}

function parseIsoDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function buildCashflowTrend(
  startStr: string,
  endStr: string,
  entries: { localDate: string; amount: number; type: string; status: string }[]
): TrendPoint[] {
  const start = parseIsoDate(startStr)
  const endExclusive = parseIsoDate(endStr)

  const byDate = new Map<
    string,
    {
      incomeRealized: number
      expenseRealized: number
      expenseProjected: number
    }
  >()

  for (const entry of entries) {
    if (!byDate.has(entry.localDate)) {
      byDate.set(entry.localDate, {
        incomeRealized: 0,
        expenseRealized: 0,
        expenseProjected: 0,
      })
    }

    const day = byDate.get(entry.localDate)!
    if (entry.type === "receita" && entry.status === "Pago") {
      day.incomeRealized += entry.amount
    }

    if (entry.type === "despesa") {
      const expenseValue = Math.abs(entry.amount)
      if (entry.status === "Pago") day.expenseRealized += expenseValue
      if (entry.status === "Pendente") day.expenseProjected += expenseValue
    }
  }

  let incomeAcc = 0
  let expenseRealizedAcc = 0
  let expenseProjectedAcc = 0
  const trend: TrendPoint[] = []

  for (
    const cursor = new Date(start);
    cursor < endExclusive;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const date = toDateString(cursor)
    const day = byDate.get(date)

    incomeAcc += day?.incomeRealized ?? 0
    expenseRealizedAcc += day?.expenseRealized ?? 0
    expenseProjectedAcc += day?.expenseProjected ?? 0

    trend.push({
      date,
      label: String(cursor.getDate()).padStart(2, "0"),
      income_realized_acc: Number(incomeAcc.toFixed(2)),
      expense_realized_acc: Number(expenseRealizedAcc.toFixed(2)),
      expense_projected_acc: Number(
        (expenseRealizedAcc + expenseProjectedAcc).toFixed(2)
      ),
    })
  }

  return trend
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: settings } = await supabase
    .from("user_settings")
    .select("financial_month_start_day, timezone")
    .eq("id", user.id)
    .single()

  const startDay = settings?.financial_month_start_day ?? 1
  const timezone = settings?.timezone ?? "America/Sao_Paulo"

  // Resolve financial month in user's timezone (not server UTC)
  const nowLocal = toDateInTimezone(new Date(), timezone)
  const { start, endExclusive } = resolveFinancialMonth(nowLocal, startDay)
  const startStr = toDateString(start)
  const endStr = toDateString(endExclusive)

  const queryStart = new Date(start)
  queryStart.setDate(queryStart.getDate() - 1)
  const queryEnd = new Date(endExclusive)
  queryEnd.setDate(queryEnd.getDate() + 1)

  const [
    balancesResult,
    categoriesByParentResult,
    totalResult,
    incomeResult,
    recentResult,
    periodTransactionsResult,
    categoriesResult,
    budgetsResult,
    invoicesResult,
    housingSystemCategoryResult,
    uncategorizedSystemCategoryResult,
  ] = await Promise.all([
    supabase.rpc("get_balances_by_currency"),
    supabase.rpc("get_category_expenses_by_parent", {
      p_start: startStr,
      p_end_exclusive: endStr,
      p_timezone: timezone,
    }),
    supabase.rpc("get_month_expenses_total", {
      p_start: startStr,
      p_end_exclusive: endStr,
      p_timezone: timezone,
    }),
    supabase.rpc("get_month_income_total", {
      p_start: startStr,
      p_end_exclusive: endStr,
      p_timezone: timezone,
    }),
    supabase
      .from("transactions")
      .select(
        "id, amount, currency, type, status, description, occurred_at, categories(name, icon)"
      )
      .is("deleted_at", null)
      .neq("type", "transferencia")
      .order("occurred_at", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("id, amount, currency, type, status, occurred_at, category_id")
      .is("deleted_at", null)
      .neq("type", "transferencia")
      .gte("occurred_at", queryStart.toISOString())
      .lt("occurred_at", queryEnd.toISOString()),
    supabase
      .from("categories")
      .select("id, name, parent_category_id")
      .is("deleted_at", null),
    supabase.rpc("get_budgets_with_usage", {
      p_start: startStr,
      p_end_exclusive: endStr,
      p_timezone: timezone,
    }),
    supabase
      .from("invoices")
      .select("id, due_date, status, credit_cards(name)")
      .in("status", ["Aberta", "Fechada", "Vencida"])
      .order("due_date", { ascending: true }),
    // Resolvidas estruturalmente (is_active = true), nunca por comparação de nome sozinha
    // sobre o catálogo do usuário — mesmo padrão usado no hotfix de pagar_fatura (Fase A1).
    supabase
      .from("system_categories")
      .select("id")
      .eq("name", "Moradia")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("system_categories")
      .select("id")
      .eq("name", "Outras / Não Categorizado")
      .eq("is_active", true)
      .maybeSingle(),
  ])

  if (balancesResult.error)
    return NextResponse.json(
      { error: balancesResult.error.message },
      { status: 500 }
    )
  if (categoriesByParentResult.error)
    return NextResponse.json(
      { error: categoriesByParentResult.error.message },
      { status: 500 }
    )
  if (totalResult.error)
    return NextResponse.json(
      { error: totalResult.error.message },
      { status: 500 }
    )
  if (incomeResult.error)
    return NextResponse.json(
      { error: incomeResult.error.message },
      { status: 500 }
    )
  if (periodTransactionsResult.error)
    return NextResponse.json(
      { error: periodTransactionsResult.error.message },
      { status: 500 }
    )
  if (categoriesResult.error)
    return NextResponse.json(
      { error: categoriesResult.error.message },
      { status: 500 }
    )
  if (budgetsResult.error)
    return NextResponse.json(
      { error: budgetsResult.error.message },
      { status: 500 }
    )
  if (invoicesResult.error)
    return NextResponse.json(
      { error: invoicesResult.error.message },
      { status: 500 }
    )

  const categoriesByParent = categoriesByParentResult.data ?? []
  const monthExpenses = Number(totalResult.data ?? 0)
  const monthIncome = Number(incomeResult.data ?? 0)
  const operationalResult = monthIncome - monthExpenses

  const periodTransactions = (periodTransactionsResult.data ?? [])
    .map((tx) => ({
      ...tx,
      localDate: toDateString(
        toDateInTimezone(new Date(tx.occurred_at), timezone)
      ),
    }))
    .filter((tx) => tx.localDate >= startStr && tx.localDate < endStr)

  const projectedExpenses = periodTransactions
    .filter((tx) => tx.type === "despesa" && tx.status === "Pendente")
    .reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0)

  const projectedIncome = periodTransactions
    .filter((tx) => tx.type === "receita" && tx.status === "Pendente")
    .reduce((acc, tx) => acc + Number(tx.amount), 0)

  const currentBalanceBase = (balancesResult.data ?? []).reduce(
    (acc, row) => acc + Number(row.balance),
    0
  )
  const projectedNetEndOfPeriod =
    currentBalanceBase + projectedIncome - projectedExpenses

  const categoryMap = new Map(
    (categoriesResult.data ?? []).map((c) => [
      c.id,
      { id: c.id, name: c.name, parentId: c.parent_category_id ?? c.id },
    ])
  )

  const drilldownMap = new Map<
    string,
    {
      parent_category_id: string
      parent_category_name: string
      total: number
      subcategories: Map<
        string,
        { category_id: string; category_name: string; total: number }
      >
    }
  >()

  for (const tx of periodTransactions) {
    if (tx.type !== "despesa" || tx.status !== "Pago" || !tx.category_id)
      continue

    const sub = categoryMap.get(tx.category_id)
    if (!sub) continue

    const parent = categoryMap.get(sub.parentId) ?? sub
    if (!drilldownMap.has(parent.id)) {
      drilldownMap.set(parent.id, {
        parent_category_id: parent.id,
        parent_category_name: parent.name,
        total: 0,
        subcategories: new Map(),
      })
    }

    const value = Math.abs(Number(tx.amount))
    const parentBucket = drilldownMap.get(parent.id)!
    parentBucket.total += value

    const existingSub = parentBucket.subcategories.get(sub.id)
    if (existingSub) {
      existingSub.total += value
    } else {
      parentBucket.subcategories.set(sub.id, {
        category_id: sub.id,
        category_name: sub.name,
        total: value,
      })
    }
  }

  const categoryDrilldown = Array.from(drilldownMap.values())
    .map((item) => ({
      parent_category_id: item.parent_category_id,
      parent_category_name: item.parent_category_name,
      total: Number(item.total.toFixed(2)),
      subcategories: Array.from(item.subcategories.values())
        .map((sub) => ({ ...sub, total: Number(sub.total.toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)

  const cashflowTrend = buildCashflowTrend(startStr, endStr, periodTransactions)

  const alerts: AlertItem[] = []

  for (const budget of budgetsResult.data ?? []) {
    const percentage = Number(budget.percentage)
    if (percentage >= 100) {
      alerts.push({
        id: `budget-over-${budget.id}`,
        severity: "danger",
        title: `Orçamento estourado: ${budget.category_name}`,
        message: `${percentage.toFixed(1)}% do limite já consumido.`,
      })
      continue
    }

    if (percentage >= 85) {
      alerts.push({
        id: `budget-warn-${budget.id}`,
        severity: "warning",
        title: `Orçamento no limite: ${budget.category_name}`,
        message: `${percentage.toFixed(1)}% do limite utilizado.`,
      })
    }
  }

  for (const invoice of invoicesResult.data ?? []) {
    const dueDate = parseIsoDate(invoice.due_date)
    const diffDays = Math.round(
      (dueDate.getTime() - nowLocal.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays >= 0 && diffDays <= 7) {
      alerts.push({
        id: `invoice-due-${invoice.id}`,
        severity: diffDays <= 2 ? "danger" : "warning",
        title: `Fatura vence em ${diffDays} dia(s)`,
        message: `${invoice.credit_cards?.name ?? "Cartão"} • vencimento ${invoice.due_date}`,
      })
    }
  }

  if (operationalResult > 0 && projectedExpenses > 0) {
    alerts.push({
      id: "projection-positive",
      severity: "info",
      title: "Projeção positiva para o período",
      message:
        "Mesmo com despesas pendentes, o mês tende a fechar com saldo positivo.",
    })
  }

  const housingTotal =
    categoriesByParent.find(
      (c) =>
        c.parent_system_category_id === housingSystemCategoryResult.data?.id
    )?.total ?? 0
  const uncategorizedTotal =
    categoriesByParent.find(
      (c) =>
        c.parent_system_category_id ===
        uncategorizedSystemCategoryResult.data?.id
    )?.total ?? 0

  return NextResponse.json({
    balancesByCurrency: balancesResult.data ?? [],
    monthExpenses,
    monthIncome,
    projectedExpenses: Number(projectedExpenses.toFixed(2)),
    projectedIncome: Number(projectedIncome.toFixed(2)),
    projectedNetEndOfPeriod: Number(projectedNetEndOfPeriod.toFixed(2)),
    operationalResult: Number(operationalResult.toFixed(2)),
    topCategories: categoriesByParent.slice(0, 5).map((c) => ({
      category_id: c.parent_category_id,
      category_name: c.parent_category_name,
      total: c.total,
    })),
    categoryDrilldown,
    cashflowTrend,
    alerts: alerts.slice(0, 5),
    recentTransactions: recentResult.data ?? [],
    periodStart: startStr,
    periodEnd: endStr,
    indicators: computeFinancialIndicators({
      monthExpenses,
      monthIncome,
      housingTotal: Number(housingTotal),
      uncategorizedTotal: Number(uncategorizedTotal),
    }),
  })
}
