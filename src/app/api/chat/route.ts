import { getLlmModel } from "@/features/llm/server/llm-provider"
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
  isStepCount,
} from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"

import { payInvoiceSchema } from "@/features/credit-cards/domain/schemas"
import { createCategory } from "@/features/transactions/api/categories"
import { createTransaction } from "@/features/transactions/api/transactions"
import {
  createCategorySchema,
  createTransactionSchema,
} from "@/features/transactions/domain/schemas"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { DB_SCHEMA_PROMPT } from "@/features/llm/server/db-schema-prompt"
import { log } from "@/shared/lib/logger"
import { toDateInTimezone } from "@/shared/lib/timezone"
import { createClient } from "@/shared/supabase/server"

type ChatRequestBody = {
  messages: UIMessage[]
  context?: {
    pathname?: string
  }
}

function resolveCurrentFinancialMonth(timezone: string, startDay: number) {
  const nowLocal = toDateInTimezone(new Date(), timezone)
  const { start, endExclusive } = resolveFinancialMonth(nowLocal, startDay)

  return {
    startStr: toDateString(start),
    endStr: toDateString(endExclusive),
    monthLabel: toDateString(start).slice(0, 7),
  }
}

export async function POST(request: Request) {
  let model
  try {
    model = getLlmModel()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const body = (await request.json()) as ChatRequestBody
  const parsedMessages = z
    .array(z.custom<UIMessage>())
    .safeParse(body?.messages ?? [])

  if (!parsedMessages.success || parsedMessages.data.length === 0) {
    return NextResponse.json(
      { error: "Payload inválido. Envie um array de mensagens." },
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

  const [
    { data: settings },
    { data: categories },
    { data: accounts },
    { data: openInvoices },
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("financial_month_start_day, timezone")
      .eq("id", user.id)
      .single(),
    supabase
      .from("categories")
      .select("id, name, type, parent_category_id")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, currency")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select("id, due_date, status, credit_cards(name)")
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
    .slice(0, 15)
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
    .slice(0, 15)
    .map((item) => `${item.id} | ${item.name} | ${item.currency}`)
    .join("\n")

  const invoicesPrompt = (openInvoices ?? [])
    .slice(0, 15)
    .map(
      (item) =>
        `${item.id} | ${item.credit_cards?.name ?? "Cartão"} | venc: ${item.due_date} | status: ${item.status}`
    )
    .join("\n")

  const currentPath = body.context?.pathname?.trim() || "(não informado)"
  const modelMessages = await convertToModelMessages(parsedMessages.data)

  const system = [
    "Assistente financeiro. Responda em português.",
    "Use tools para dados reais. Não invente IDs.",
    "Para análises ad-hoc, use queryDatabaseTool (apenas SELECT).",
    "Se não souber, diga explicitamente.",
    `Timezone do usuário: ${timezone}.`,
    `Mês financeiro atual: ${monthLabel} (${startStr} a ${endStr}, fim exclusivo).`,
    `Tela atual da aplicação: ${currentPath}.`,
    "Categorias do usuário (id | nome | tipo | escopo):",
    categoriesPrompt || "(sem categorias)",
    "Contas do usuário (id | nome | moeda):",
    accountsPrompt || "(sem contas)",
    "Faturas em aberto/fechadas/vencidas (id | cartão | vencimento | status):",
    invoicesPrompt || "(sem faturas elegíveis)",
    "Schema do banco disponível para queryDatabaseTool:",
    DB_SCHEMA_PROMPT,
  ].join("\n")

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    stopWhen: isStepCount(5),
    tools: {
      getAccountBalances: tool({
        description:
          "Retorna saldos agregados por moeda, considerando apenas transações pagas.",
        inputSchema: z.object({}).nullish(),
        execute: async () => {
          const { data, error } = await supabase.rpc("get_balances_by_currency")

          if (error) {
            log("error", "llm.tool.getAccountBalances.failed", {
              error: error.message,
              userId: user.id,
            })
            throw new Error(error.message)
          }

          return data ?? []
        },
      }),
      getRecentTransactions: tool({
        description:
          "Retorna as últimas transações (exceto transferências), com categoria e status.",
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(30)
            .optional()
            .describe("Quantidade de transações a retornar"),
        }),
        execute: async ({ limit }) => {
          const txLimit = limit ?? 10
          const { data, error } = await supabase
            .from("transactions")
            .select(
              "id, amount, currency, type, status, description, occurred_at, categories(name)"
            )
            .is("deleted_at", null)
            .neq("type", "transferencia")
            .order("occurred_at", { ascending: false })
            .limit(txLimit)

          if (error) {
            log("error", "llm.tool.getRecentTransactions.failed", {
              error: error.message,
              userId: user.id,
            })
            throw new Error(error.message)
          }

          return data ?? []
        },
      }),
      getBudgetsStatus: tool({
        description:
          "Retorna status dos orçamentos no mês financeiro solicitado.",
        inputSchema: z.object({
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional()
            .describe(
              "Mês no formato YYYY-MM. Se omitido, usa mês financeiro atual."
            ),
        }),
        execute: async ({ month }) => {
          const referenceMonth = month ?? monthLabel
          const [year, monthIndex] = referenceMonth.split("-").map(Number)

          const monthStartDate = new Date(year, monthIndex - 1, 1)
          const localStart = toDateInTimezone(monthStartDate, timezone)
          const { start, endExclusive } = resolveFinancialMonth(
            localStart,
            startDay
          )

          const { data, error } = await supabase.rpc("get_budgets_with_usage", {
            p_start: toDateString(start),
            p_end_exclusive: toDateString(endExclusive),
            p_timezone: timezone,
          })

          if (error) {
            log("error", "llm.tool.getBudgetsStatus.failed", {
              error: error.message,
              userId: user.id,
            })
            throw new Error(error.message)
          }

          return {
            month: referenceMonth,
            periodStart: toDateString(start),
            periodEndExclusive: toDateString(endExclusive),
            budgets: data ?? [],
          }
        },
      }),
      createTransactionTool: tool({
        description:
          "Cria um lançamento de receita ou despesa na conta escolhida. Use apenas IDs existentes de conta e categoria.",
        inputSchema: createTransactionSchema,
        execute: async (input) => {
          try {
            const created = await createTransaction(supabase, input)

            log("info", "llm.tool.createTransactionTool.created", {
              transactionId: created.id,
              userId: user.id,
              amount: created.amount,
              type: created.type,
            })

            return {
              ok: true,
              transactionId: created.id,
              amount: created.amount,
              type: created.type,
              status: created.status,
              occurredAt: created.occurred_at,
            }
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Erro ao criar lançamento."

            log("error", "llm.tool.createTransactionTool.failed", {
              error: message,
              userId: user.id,
            })

            throw new Error(message)
          }
        },
      }),
      createCategoryTool: tool({
        description:
          "Cria uma nova categoria/subcategoria. Para subcategoria, informe parentCategoryId com uma categoria-pai existente.",
        inputSchema: createCategorySchema,
        execute: async (input) => {
          try {
            const created = await createCategory(supabase, input)

            log("info", "llm.tool.createCategoryTool.created", {
              categoryId: created.id,
              userId: user.id,
              type: input.type,
              parentCategoryId: input.parentCategoryId ?? null,
            })

            return {
              ok: true,
              categoryId: created.id,
              name: input.name,
              type: input.type,
              parentCategoryId: input.parentCategoryId ?? null,
            }
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Erro ao criar categoria."

            log("error", "llm.tool.createCategoryTool.failed", {
              error: message,
              userId: user.id,
            })

            throw new Error(message)
          }
        },
      }),
      queryDatabaseTool: tool({
        description:
          "Executa uma query SELECT personalizada no banco quando as tools padrão não atendem. Use para análises ad-hoc, agrupamentos e perguntas complexas.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Query PostgreSQL em SQL. Deve ser apenas SELECT, começar com SELECT e respeitar RLS filtrando user_id e deleted_at IS NULL."
            ),
        }),
        execute: async ({ query }) => {
          const { data, error } = await supabase.rpc("execute_readonly_sql", {
            p_query: query,
          })

          if (error) {
            console.error("[queryDatabaseTool] query:", query)
            console.error("[queryDatabaseTool] error:", error.message)
            log("error", "llm.tool.queryDatabaseTool.failed", {
              error: error.message,
              query,
              userId: user.id,
            })
            return `Erro na query: ${error.message}`
          }

          return data ?? []
        },
      }),
      payInvoiceTool: tool({
        description:
          "Paga uma fatura de cartão usando a conta informada. Use IDs existentes de fatura e conta.",
        inputSchema: payInvoiceSchema,
        execute: async ({ invoiceId, accountId }) => {
          const { error } = await supabase.rpc("pagar_fatura", {
            p_invoice_id: invoiceId,
            p_account_id: accountId,
          })

          if (error) {
            log("error", "llm.tool.payInvoiceTool.failed", {
              error: error.message,
              invoiceId,
              accountId,
              userId: user.id,
            })
            throw new Error(error.message)
          }

          log("info", "llm.tool.payInvoiceTool.paid", {
            invoiceId,
            accountId,
            userId: user.id,
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

  return result.toUIMessageStreamResponse()
}
