import { NextResponse } from "next/server"

import {
  transferSchema,
  updateTransferSchema,
} from "@/features/transactions/domain/schemas"
import { createClient } from "@/shared/supabase/server"
import { log } from "@/shared/lib/logger"

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = transferSchema.safeParse(body)

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

  const {
    originAccountId,
    destinationAccountId,
    amount,
    description,
    occurredAt,
  } = parsed.data

  const { data, error } = await supabase.rpc("efetivar_transferencia", {
    p_origin_account_id: originAccountId,
    p_destination_account_id: destinationAccountId,
    p_amount: amount,
    p_description: description,
    p_occurred_at: new Date(occurredAt).toISOString(),
  })

  if (error) {
    log("error", "transfer.failed", { error: error.message, userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  log("info", "transfer.created", { transferId: data, userId: user.id })
  return NextResponse.json({ transferId: data })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const parsed = updateTransferSchema.safeParse(body)

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

  const {
    id,
    originAccountId,
    destinationAccountId,
    amount,
    description,
    occurredAt,
  } = parsed.data

  const { data, error } = await supabase.rpc("atualizar_transferencia", {
    p_transfer_id: id,
    p_origin_account_id: originAccountId,
    p_destination_account_id: destinationAccountId,
    p_amount: amount,
    p_description: description,
    p_occurred_at: new Date(occurredAt).toISOString(),
  })

  if (error) {
    log("error", "transfer.update_failed", {
      error: error.message,
      userId: user.id,
    })
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  log("info", "transfer.updated", { transferId: data, userId: user.id })
  return NextResponse.json({ transferId: data })
}
