import { google } from "@ai-sdk/google"
import { generateText, tool } from "ai"
import { z } from "zod"

import { payInvoiceSchema } from "@/features/credit-cards/domain/schemas"
import {
  createCategorySchema,
  createTransactionSchema,
} from "@/features/transactions/domain/schemas"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { log } from "@/shared/lib/logger"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { createAdminClient } from "@/shared/supabase/admin"

function resolveCurrentFinancialMonth(timezone: string, startDay: number) {
  const nowLocal = toDateInTimezone(new Date(), timezone)
  const { start, endExclusive } = resolveFinancialMonth(nowLocal, startDay)

  return {
    startStr: toDateString(start),
    endStr: toDateString(endExclusive),
    monthLabel: toDateString(start).slice(0, 7),
  }
}

function ensureGeminiApiKey() {
  if (
    !process.env.GEMINI_API_KEY &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    throw new Error(
      "Missing API key. Configure GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY."
    )
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
  }
}

function resolveTransactionLifecycleFields(occurredAtInput: string) {
  const occurredAtDate = new Date(occurredAtInput)
  const occurredAtIso = occurredAtDate.toISOString()

  const occurredDate = occurredAtInput.slice(0, 10)
  const today = new Date()
  const todayDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const isFuture = occurredDate > todayDate

  if (isFuture) {
    return {
      occurredAtIso,
      status: "Pendente" as const,
      paidAt: null,
    }
  }

  return {
    occurredAtIso,
    status: "Pago" as const,
    paidAt: occurredAtIso,
  }
}

export async function runWhatsappAssistant(input: {
  userId: string
  phoneNumber: string
  message: string
}) {
  ensureGeminiApiKey()

  const supabase = createAdminClient()

  const [
    { data: settings },
    { data: categories },
    { data: accounts },
    { data: openInvoices },
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("financial_month_start_day, timezone")
      .eq("id", input.userId)
      .single(),
    supabase
      .from("categories")
      .select("id, name, type, parent_category_id")
      .eq("user_id", input.userId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("user_id", input.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select("id, due_date, status, credit_cards(name)")
      .eq("user_id", input.userId)
      .in("status", ["Aberta", "Fechada", "Vencida"])
      .order("due_date", { ascending: true }),
  ])

  const timezone = settings?.timezone ?? "America/Sao_Paulo"
  const startDay = settings?.financial_month_start_day ?? 1

  const { startStr, endStr, monthLabel } = resolveCurrentFinancialMonth(
    timezone,
    startDay
  )

  const categoriesPrompt = (categories ?? [])
    .map((item) => {
      const scope = item.parent_category_id
        ? "subcategoria"
        : item.type === "Ambas"
          ? "especial"
          : "categoria-pai"
      return `${item.id} | ${item.name} | ${item.type} | ${scope}`
    })
    .join("\n")

  const accountsPrompt = (accounts ?? [])
    .map((item) => `${item.id} | ${item.name} | ${item.currency}`)
    .join("\n")

  const invoicesPrompt = (openInvoices ?? [])
    .map(
      (item) =>
        `${item.id} | Cartão | venc: ${item.due_date} | status: ${item.status}`
    )
    .join("\n")

  const system = [
    "Você é um assistente financeiro pessoal rigoroso e conciso.",
    "Responda sempre em português do Brasil.",
    "Canal atual: WhatsApp.",
    "Sempre priorize dados reais via tools em vez de suposições.",
    "Nunca invente IDs de conta, categoria ou fatura.",
    "Para operações de escrita, sempre use IDs existentes nas listas fornecidas.",
    "Se uma informação não existir nos dados, diga explicitamente.",
    `Timezone do usuário: ${timezone}.`,
    `Mês financeiro atual: ${monthLabel} (${startStr} a ${endStr}, fim exclusivo).`,
    `Telefone vinculado: ${input.phoneNumber}.`,
    "Categorias do usuário (id | nome | tipo | escopo):",
    categoriesPrompt || "(sem categorias)",
    "Contas do usuário (id | nome | moeda):",
    accountsPrompt || "(sem contas)",
    "Faturas em aberto/fechadas/vencidas (id | cartão | vencimento | status):",
    invoicesPrompt || "(sem faturas elegíveis)",
  ].join("\n")

  const result = await generateText({
    model: google("gemini-1.5-flash"),
    system,
    prompt: input.message,
    tools: {
      getAccountBalances: tool({
        description:
          "Retorna saldos agregados por moeda, considerando apenas transações pagas.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from("transactions")
            .select("amount, currency")
            .eq("user_id", input.userId)
            .eq("status", "Pago")
            .is("deleted_at", null)

          if (error) {
            log("error", "llm.whatsapp.tool.getAccountBalances.failed", {
              error: error.message,
              userId: input.userId,
            })
            throw new Error(error.message)
          }

          const totalsByCurrency = new Map<string, number>()
          for (const row of data ?? []) {
            const current = totalsByCurrency.get(row.currency) ?? 0
            totalsByCurrency.set(
              row.currency,
              current + Number(row.amount ?? 0)
            )
          }

          return Array.from(totalsByCurrency.entries()).map(
            ([currency, balance]) => ({ currency, balance })
          )
        },
      }),
      getRecentTransactions: tool({
        description:
          "Retorna as últimas transações (exceto transferências), com categoria e status.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(30).optional(),
        }),
        execute: async ({ limit }) => {
          const txLimit = limit ?? 10
          const { data, error } = await supabase
            .from("transactions")
            .select(
              "id, amount, currency, type, status, description, occurred_at, categories(name)"
            )
            .eq("user_id", input.userId)
            .is("deleted_at", null)
            .neq("type", "transferencia")
            .order("occurred_at", { ascending: false })
            .limit(txLimit)

          if (error) {
            log("error", "llm.whatsapp.tool.getRecentTransactions.failed", {
              error: error.message,
              userId: input.userId,
            })
            throw new Error(error.message)
          }

          return data ?? []
        },
      }),
      createTransactionTool: tool({
        description:
          "Cria um lançamento de receita ou despesa na conta escolhida. Use apenas IDs existentes de conta e categoria.",
        inputSchema: createTransactionSchema,
        execute: async (payload) => {
          const [accountResult, categoryResult] = await Promise.all([
            supabase
              .from("accounts")
              .select("id")
              .eq("id", payload.accountId)
              .eq("user_id", input.userId)
              .is("deleted_at", null)
              .single(),
            supabase
              .from("categories")
              .select("id")
              .eq("id", payload.categoryId)
              .eq("user_id", input.userId)
              .is("deleted_at", null)
              .single(),
          ])

          if (accountResult.error || !accountResult.data) {
            throw new Error("Conta inválida para este usuário.")
          }

          if (categoryResult.error || !categoryResult.data) {
            throw new Error("Categoria inválida para este usuário.")
          }

          const signedAmount =
            payload.type === "despesa"
              ? -Math.abs(payload.amount)
              : Math.abs(payload.amount)
          const lifecycle = resolveTransactionLifecycleFields(
            payload.occurredAt
          )

          const { data, error } = await supabase
            .from("transactions")
            .insert({
              user_id: input.userId,
              account_id: payload.accountId,
              category_id: payload.categoryId,
              type: payload.type,
              status: lifecycle.status,
              amount: signedAmount,
              currency: payload.currency,
              description: payload.description ?? null,
              occurred_at: lifecycle.occurredAtIso,
              paid_at: lifecycle.paidAt,
            })
            .select("id, amount, type, status, occurred_at")
            .single()

          if (error) {
            log("error", "llm.whatsapp.tool.createTransactionTool.failed", {
              error: error.message,
              userId: input.userId,
            })
            throw new Error(error.message)
          }

          log("info", "llm.whatsapp.tool.createTransactionTool.created", {
            userId: input.userId,
            transactionId: data.id,
            amount: data.amount,
            type: data.type,
          })

          return {
            ok: true,
            transactionId: data.id,
            amount: data.amount,
            type: data.type,
            status: data.status,
            occurredAt: data.occurred_at,
          }
        },
      }),
      createCategoryTool: tool({
        description:
          "Cria uma nova categoria/subcategoria. Para subcategoria, informe parentCategoryId com uma categoria-pai existente.",
        inputSchema: createCategorySchema,
        execute: async (payload) => {
          if (payload.parentCategoryId) {
            const { data: parent, error: parentError } = await supabase
              .from("categories")
              .select("id")
              .eq("id", payload.parentCategoryId)
              .eq("user_id", input.userId)
              .is("deleted_at", null)
              .single()

            if (parentError || !parent) {
              throw new Error("Categoria-pai inválida para este usuário.")
            }
          }

          const { data, error } = await supabase
            .from("categories")
            .insert({
              user_id: input.userId,
              name: payload.name,
              type: payload.type,
              parent_category_id: payload.parentCategoryId ?? null,
              icon: payload.parentCategoryId ? null : (payload.icon ?? null),
            })
            .select("id")
            .single()

          if (error) {
            log("error", "llm.whatsapp.tool.createCategoryTool.failed", {
              error: error.message,
              userId: input.userId,
            })
            throw new Error(error.message)
          }

          log("info", "llm.whatsapp.tool.createCategoryTool.created", {
            userId: input.userId,
            categoryId: data.id,
            type: payload.type,
            parentCategoryId: payload.parentCategoryId ?? null,
          })

          return {
            ok: true,
            categoryId: data.id,
            name: payload.name,
            type: payload.type,
            parentCategoryId: payload.parentCategoryId ?? null,
          }
        },
      }),
      payInvoiceTool: tool({
        description:
          "Paga uma fatura de cartão usando a conta informada. Use IDs existentes de fatura e conta.",
        inputSchema: payInvoiceSchema,
        execute: async ({ invoiceId, accountId }) => {
          const { error } = await supabase.rpc("pagar_fatura_por_usuario", {
            p_user_id: input.userId,
            p_invoice_id: invoiceId,
            p_account_id: accountId,
          })

          if (error) {
            log("error", "llm.whatsapp.tool.payInvoiceTool.failed", {
              error: error.message,
              userId: input.userId,
              invoiceId,
              accountId,
            })
            throw new Error(error.message)
          }

          log("info", "llm.whatsapp.tool.payInvoiceTool.paid", {
            userId: input.userId,
            invoiceId,
            accountId,
          })

          return {
            ok: true,
            invoiceId,
            accountId,
          }
        },
      }),
    },
  })

  return result.text.trim() || "Não consegui gerar uma resposta agora."
}
