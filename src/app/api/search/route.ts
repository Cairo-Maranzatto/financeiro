import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({
      transactions: [],
      accounts: [],
      goals: [],
      loans: [],
    })
  }

  const supabase = await createClient()
  const like = `%${q}%`

  const [txns, accounts, goals, loans] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, description, amount, currency, type, occurred_at, account_id, categories(name)"
      )
      .ilike("description", like)
      .is("deleted_at", null)
      .limit(5),
    supabase
      .from("accounts")
      .select("id, name, currency")
      .ilike("name", like)
      .is("deleted_at", null)
      .limit(5),
    supabase
      .from("goals")
      .select("id, name, target_amount, currency, status")
      .ilike("name", like)
      .is("deleted_at", null)
      .limit(5),
    supabase
      .from("loans")
      .select("id, name, status, currency")
      .ilike("name", like)
      .is("deleted_at", null)
      .limit(5),
  ])

  return NextResponse.json({
    transactions: txns.data ?? [],
    accounts: accounts.data ?? [],
    goals: goals.data ?? [],
    loans: loans.data ?? [],
  })
}
