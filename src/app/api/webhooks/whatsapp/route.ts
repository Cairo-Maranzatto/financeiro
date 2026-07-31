import { createHmac, timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { runWhatsappAssistant } from "@/features/llm/server/whatsapp-agent"
import { log } from "@/shared/lib/logger"
import { createAdminClient } from "@/shared/supabase/admin"

const inboundPayloadSchema = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        changes: z.array(
          z.object({
            value: z.object({
              metadata: z
                .object({
                  phone_number_id: z.string().optional(),
                })
                .optional(),
              messages: z
                .array(
                  z.object({
                    from: z.string(),
                    type: z.string(),
                    text: z
                      .object({
                        body: z.string(),
                      })
                      .optional(),
                  })
                )
                .optional(),
            }),
          })
        ),
      })
    )
    .optional(),
})

function resolveAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    return true
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex")
  const provided = signatureHeader.slice("sha256=".length)

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

async function sendWhatsappTextMessage(payload: {
  to: string
  body: string
  phoneNumberId?: string
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const configuredPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const phoneNumberId = payload.phoneNumberId ?? configuredPhoneNumberId

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Missing WhatsApp credentials. Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID."
    )
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.to,
        type: "text",
        text: {
          body: payload.body.slice(0, 4096),
        },
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Meta API error ${response.status}: ${body}`)
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode")
  const token = request.nextUrl.searchParams.get("hub.verify_token")
  const challenge = request.nextUrl.searchParams.get("hub.challenge")

  if (
    mode === "subscribe" &&
    token &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", { status: 200 })
  }

  return NextResponse.json(
    { error: "Token de verificação inválido." },
    { status: 403 }
  )
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (
    !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))
  ) {
    log("error", "webhook.whatsapp.signature.invalid")
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 })
  }

  let parsedBody: z.infer<typeof inboundPayloadSchema>
  try {
    parsedBody = inboundPayloadSchema.parse(JSON.parse(rawBody))
  } catch {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const firstChange = parsedBody.entry?.[0]?.changes?.[0]
  const message = firstChange?.value.messages?.[0]

  if (!message || message.type !== "text" || !message.text?.body?.trim()) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const fromPhone = message.from
  const inboundText = message.text.body.trim()
  const sourcePhoneNumberId = firstChange?.value.metadata?.phone_number_id

  try {
    const supabase = createAdminClient()
    const { data: link, error: linkError } = await supabase
      .from("whatsapp_links")
      .select("user_id")
      .eq("phone_number", fromPhone)
      .is("deleted_at", null)
      .maybeSingle()

    if (linkError) {
      throw linkError
    }

    if (!link?.user_id) {
      const appBaseUrl = resolveAppBaseUrl()
      const onboardingUrl = `${appBaseUrl}/configuracoes/whatsapp?phone=${encodeURIComponent(
        `+${fromPhone}`
      )}`

      await sendWhatsappTextMessage({
        to: fromPhone,
        phoneNumberId: sourcePhoneNumberId,
        body: `Olá! Não reconheço seu número ainda. Para vincular sua conta, acesse: ${onboardingUrl}`,
      })

      log("info", "webhook.whatsapp.unlinked_number", {
        phone: fromPhone,
      })

      return NextResponse.json({ ok: true, linked: false })
    }

    const assistantReply = await runWhatsappAssistant({
      userId: link.user_id,
      phoneNumber: fromPhone,
      message: inboundText,
    })

    await sendWhatsappTextMessage({
      to: fromPhone,
      phoneNumberId: sourcePhoneNumberId,
      body: assistantReply,
    })

    log("info", "webhook.whatsapp.message_processed", {
      userId: link.user_id,
      phone: fromPhone,
    })

    return NextResponse.json({ ok: true, linked: true })
  } catch (error) {
    const safeError =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          }
        : { raw: typeof error === "string" ? error : JSON.stringify(error) }

    log("error", "webhook.whatsapp.failed", {
      error: safeError,
      phone: fromPhone,
      messagePreview: inboundText.slice(0, 100),
    })

    const messageError =
      error instanceof Error ? error.message : "Erro interno no webhook."

    return NextResponse.json({ error: messageError }, { status: 500 })
  }
}
