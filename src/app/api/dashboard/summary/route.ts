import { NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { toDateInTimezone } from "@/shared/lib/timezone"

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

  const [balancesResult, categoriesResult, totalResult, recentResult] =
    await Promise.all([
      supabase.rpc("get_balances_by_currency"),
      supabase.rpc("get_category_expenses", {
        p_start: startStr,
        p_end_exclusive: endStr,
        p_timezone: timezone,
      }),
      supabase.rpc("get_month_expenses_total", {
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
    ])

  if (balancesResult.error)
    return NextResponse.json(
      { error: balancesResult.error.message },
      { status: 500 }
    )
  if (categoriesResult.error)
    return NextResponse.json(
      { error: categoriesResult.error.message },
      { status: 500 }
    )
  if (totalResult.error)
    return NextResponse.json(
      { error: totalResult.error.message },
      { status: 500 }
    )

  return NextResponse.json({
    balancesByCurrency: balancesResult.data ?? [],
    monthExpenses: Number(totalResult.data ?? 0),
    topCategories: categoriesResult.data ?? [],
    recentTransactions: recentResult.data ?? [],
    periodStart: startStr,
    periodEnd: endStr,
  })
}
