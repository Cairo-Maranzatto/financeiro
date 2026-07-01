import { z } from "zod"

import { currencySchema } from "@/features/accounts/domain/schemas"

export const transactionTypeSchema = z.enum(["receita", "despesa"])

export const createTransactionSchema = z.object({
  accountId: z.uuid("Selecione uma conta."),
  categoryId: z.uuid("Selecione uma categoria."),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  currency: currencySchema,
  description: z.string().optional(),
  occurredAt: z.string().min(1, "Informe a data."),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const transferSchema = z
  .object({
    originAccountId: z.uuid("Selecione a conta de origem."),
    destinationAccountId: z.uuid("Selecione a conta de destino."),
    amount: z.coerce.number().positive("O valor deve ser maior que zero."),
    description: z.string().optional(),
    occurredAt: z.string().min(1, "Informe a data."),
  })
  .refine((data) => data.originAccountId !== data.destinationAccountId, {
    message: "A conta de origem e destino não podem ser a mesma.",
    path: ["destinationAccountId"],
  })

export type TransferInput = z.infer<typeof transferSchema>
