import { NextResponse } from "next/server"
import { z } from "zod"

import { log } from "@/shared/lib/logger"
import { createAdminClient } from "@/shared/supabase/admin"
import { createClient } from "@/shared/supabase/server"

const linkSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(8, "Número inválido.")
    .max(20, "Número inválido."),
})

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "")
}

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export async function GET() {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("whatsapp_links")
    .select("phone_number, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    linked: Boolean(data),
    phoneNumber: data?.phone_number ? `+${data.phone_number}` : null,
    linkedAt: data?.created_at ?? null,
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const payload = await request.json()
  const parsed = linkSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 }
    )
  }

  const normalized = normalizePhoneNumber(parsed.data.phoneNumber)
  if (!/^[1-9][0-9]{7,15}$/.test(normalized)) {
    return NextResponse.json(
      { error: "Número inválido. Use padrão internacional com DDI." },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { error: clearError } = await admin
    .from("whatsapp_links")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("deleted_at", null)

  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 })
  }

  const { data, error } = await admin
    .from("whatsapp_links")
    .insert({ user_id: userId, phone_number: normalized })
    .select("phone_number")
    .single()

  if (error) {
    const isPhoneConflict = error.code === "23505"
    return NextResponse.json(
      {
        error: isPhoneConflict
          ? "Este número já está vinculado a outra conta."
          : error.message,
      },
      { status: isPhoneConflict ? 409 : 500 }
    )
  }

  log("info", "whatsapp.link.created", { userId, phone: normalized })
  return NextResponse.json({ ok: true, phoneNumber: `+${data.phone_number}` })
}

export async function DELETE() {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("whatsapp_links")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("deleted_at", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log("info", "whatsapp.link.deleted", { userId })
  return NextResponse.json({ ok: true })
}
