import { z } from "zod"

import { currencySchema } from "@/features/accounts/domain/schemas"

export const createLoanSchema = z.object({
  name: z.string().min(2, "Nome mínimo 2 caracteres."),
  principalAmount: z.coerce
    .number()
    .positive("Valor principal deve ser positivo."),
  interestRate: z.coerce.number().min(0, "Taxa não pode ser negativa."),
  installmentsCount: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 parcela.")
    .max(360, "Máximo 360 parcelas."),
  currency: currencySchema,
  defaultAccountId: z
    .string()
    .uuid("Selecione uma conta.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
})

export const payInstallmentSchema = z.object({
  installmentId: z.string().uuid(),
  accountId: z.string().uuid("Selecione uma conta."),
})

export type CreateLoanInput = z.output<typeof createLoanSchema>
export type PayInstallmentInput = z.output<typeof payInstallmentSchema>
