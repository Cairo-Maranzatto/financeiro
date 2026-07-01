import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/shared/supabase/server"
import { createLoanSchema } from "@/features/loans/domain/schemas"
import { log } from "@/shared/lib/logger"

const bodySchema = z.object({
  input: createLoanSchema,
  installments: z
    .array(
      z.object({
        installmentNumber: z.number().int().positive(),
        amount: z.number().positive(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { input, installments } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("criar_emprestimo", {
    p_name: input.name,
    p_principal_amount: input.principalAmount,
    p_interest_rate: input.interestRate,
    p_installments_count: input.installmentsCount,
    p_currency: input.currency,
    p_default_account_id: (input.defaultAccountId ?? null) as string,
    p_installments: installments,
  })

  if (error) {
    log("error", "loan.create.failed", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log("info", "loan.created", { id: data, name: input.name })
  return NextResponse.json({ id: data })
}
