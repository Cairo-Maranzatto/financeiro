import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import { log } from "@/shared/lib/logger"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("generate_recurrences")

  if (error) {
    log("error", "cron.generate-recurrences.failed", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log("info", "cron.generate-recurrences.done", { generated: data })
  return NextResponse.json({ generated: data })
}
