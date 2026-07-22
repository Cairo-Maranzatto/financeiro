import { z } from "zod"

import { currencySchema } from "@/features/accounts/domain/schemas"

export const transactionTypeSchema = z.enum(["receita", "despesa"])
export type TransactionType = z.infer<typeof transactionTypeSchema>

export const categoryTypeSchema = z.enum(["Despesa", "Receita", "Ambas"])
export type CategoryType = z.infer<typeof categoryTypeSchema>

export const createCategorySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  type: categoryTypeSchema,
  parentCategoryId: z.uuid().optional(),
  icon: z.string().optional(),
})
export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  type: categoryTypeSchema,
  parentCategoryId: z.uuid().optional(),
  icon: z.string().optional(),
})
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

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

export const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.uuid("Selecione uma conta."),
  categoryId: z.uuid("Selecione uma categoria."),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  currency: currencySchema,
  description: z.string().optional(),
  occurredAt: z.string().min(1, "Informe a data."),
})

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

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

export const updateTransferSchema = z
  .object({
    id: z.string().uuid(),
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

export type UpdateTransferInput = z.infer<typeof updateTransferSchema>
