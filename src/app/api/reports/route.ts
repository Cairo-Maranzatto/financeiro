import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import { reportFiltersSchema } from "@/features/reports/domain/schemas"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const filters = reportFiltersSchema.parse({
      start: searchParams.get("start"),
      endExclusive: searchParams.get("endExclusive"),
      timezone: searchParams.get("timezone") || undefined,
      currency: searchParams.get("currency") || undefined,
      categoryLevel: searchParams.get("categoryLevel") || undefined,
      trendInterval: searchParams.get("trendInterval") || undefined,
      accountId: searchParams.get("accountId") || undefined,
    })

    const [
      totalsResult,
      categoriesIncomeResult,
      categoriesExpenseResult,
      trendResult,
      transactionsResult,
    ] = await Promise.all([
      supabase.rpc("get_report_totals", {
        p_start: filters.start,
        p_end_exclusive: filters.endExclusive,
        p_timezone: filters.timezone,
        p_account_id: filters.accountId,
      }),
      supabase.rpc("get_report_by_category", {
        p_start: filters.start,
        p_end_exclusive: filters.endExclusive,
        p_type: "receita",
        p_timezone: filters.timezone,
        p_level: filters.categoryLevel,
        p_account_id: filters.accountId,
      }),
      supabase.rpc("get_report_by_category", {
        p_start: filters.start,
        p_end_exclusive: filters.endExclusive,
        p_type: "despesa",
        p_timezone: filters.timezone,
        p_level: filters.categoryLevel,
        p_account_id: filters.accountId,
      }),
      supabase.rpc("get_report_trend", {
        p_start: filters.start,
        p_end_exclusive: filters.endExclusive,
        p_timezone: filters.timezone,
        p_interval: filters.trendInterval,
        p_account_id: filters.accountId,
      }),
      (() => {
        let query = supabase
          .from("transactions")
          .select("*, categories(name, icon), accounts(name)")
          .is("deleted_at", null)
          .order("occurred_at", { ascending: false })
          .gte("occurred_at", new Date(filters.start).toISOString())
          .lt("occurred_at", new Date(filters.endExclusive).toISOString())

        if (filters.accountId) {
          query = query.eq("account_id", filters.accountId)
        }

        return query
      })(),
    ])

    if (totalsResult.error) throw totalsResult.error
    if (categoriesIncomeResult.error) throw categoriesIncomeResult.error
    if (categoriesExpenseResult.error) throw categoriesExpenseResult.error
    if (trendResult.error) throw trendResult.error
    if (transactionsResult.error) throw transactionsResult.error

    return NextResponse.json({
      totals: totalsResult.data,
      categoriesIncome: categoriesIncomeResult.data,
      categoriesExpense: categoriesExpenseResult.data,
      trend: trendResult.data,
      transactions: transactionsResult.data,
      filters,
    })
  } catch (error: unknown) {
    console.error("Report API Error:", error)
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
