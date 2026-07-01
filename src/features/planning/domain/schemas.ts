import { z } from "zod"

import { currencySchema } from "@/features/accounts/domain/schemas"

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria."),
  amountLimit: z.coerce.number().positive("O limite deve ser maior que zero."),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
})

export const createRecurrenceSchema = z.object({
  accountId: z.string().uuid("Selecione uma conta."),
  categoryId: z.string().uuid("Selecione uma categoria."),
  type: z.enum(["despesa", "receita"]),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  currency: currencySchema,
  description: z.string().optional(),
  frequency: z.enum(["diaria", "semanal", "mensal", "anual"]),
  nextOccurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

export const createGoalSchema = z.object({
  name: z.string().min(2, "Nome mínimo 2 caracteres."),
  targetAmount: z.coerce.number().positive("Valor alvo deve ser positivo."),
  currency: currencySchema,
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

export const allocateToGoalSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.coerce.number().positive("Valor deve ser positivo."),
  accountId: z
    .string()
    .uuid("Selecione uma conta.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: z.string().optional(),
})

export type CreateBudgetInput = z.output<typeof createBudgetSchema>
export type CreateRecurrenceInput = z.output<typeof createRecurrenceSchema>
export type CreateGoalInput = z.output<typeof createGoalSchema>
export type AllocateToGoalInput = z.output<typeof allocateToGoalSchema>
