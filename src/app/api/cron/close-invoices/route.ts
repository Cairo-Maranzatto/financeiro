import { NextResponse } from "next/server"

import { createClient } from "@/shared/supabase/server"
import { log } from "@/shared/lib/logger"

// Vercel Cron dispara com header Authorization: Bearer <CRON_SECRET>.
// Configurar CRON_SECRET no .env.local e nas env vars da Vercel.
// Adicionar também ao vercel.json:
// { "crons": [{ "path": "/api/cron/close-invoices", "schedule": "0 6 * * *" }] }
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: count, error } = await supabase.rpc("close_due_invoices")

  if (error) {
    log("error", "cron.close-invoices.failed", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log("info", "cron.close-invoices.done", { closed: count })
  return NextResponse.json({ closed: count })
}
