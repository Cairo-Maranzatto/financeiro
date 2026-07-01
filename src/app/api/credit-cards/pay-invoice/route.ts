import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/shared/supabase/server"
import { log } from "@/shared/lib/logger"

const schema = z.object({
  invoiceId: z.uuid("ID de fatura inválido."),
  accountId: z.uuid("ID de conta inválido."),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const { invoiceId, accountId } = parsed.data

  const { error } = await supabase.rpc("pagar_fatura", {
    p_invoice_id: invoiceId,
    p_account_id: accountId,
  })

  if (error) {
    log("error", "invoice.pay.failed", {
      error: error.message,
      invoiceId,
      userId: user.id,
    })
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  log("info", "invoice.paid", { invoiceId, userId: user.id })
  return NextResponse.json({ ok: true })
}
