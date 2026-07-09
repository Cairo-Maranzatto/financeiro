import { NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { computeFinancialIndicators } from "@/shared/domain/financial-indicators"

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

  const [
    balancesResult,
    categoriesByParentResult,
    totalResult,
    incomeResult,
    recentResult,
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
        "id, amount, currency, type, description, occurred_at, categories(name, icon)"
      )
      .is("deleted_at", null)
      .neq("type", "transferencia")
      .order("occurred_at", { ascending: false })
      .limit(10),
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

  const categoriesByParent = categoriesByParentResult.data ?? []
  const monthExpenses = Number(totalResult.data ?? 0)
  const monthIncome = Number(incomeResult.data ?? 0)

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
    topCategories: categoriesByParent.slice(0, 5).map((c) => ({
      category_id: c.parent_category_id,
      category_name: c.parent_category_name,
      total: c.total,
    })),
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
