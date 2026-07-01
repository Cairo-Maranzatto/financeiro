import { z } from "zod"

import { currencySchema } from "@/features/accounts/domain/schemas"

export const createCreditCardSchema = z.object({
  name: z.string().min(1, "Informe um nome para o cartão."),
  creditLimit: z.coerce.number().positive("Informe um limite positivo."),
  closingDay: z.coerce
    .number()
    .int()
    .min(1)
    .max(28, "Use um dia entre 1 e 28."),
  dueDay: z.coerce.number().int().min(1).max(28, "Use um dia entre 1 e 28."),
  defaultAccountId: z.uuid().optional(),
})

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>

export const purchaseSchema = z.object({
  cardId: z.uuid("Selecione um cartão."),
  categoryId: z.uuid("Selecione uma categoria."),
  totalAmount: z.coerce.number().positive("O valor deve ser maior que zero."),
  currency: currencySchema,
  description: z.string().optional(),
  purchaseDate: z.string().min(1, "Informe a data da compra."),
  installments: z.coerce.number().int().min(1, "Mínimo 1 parcela.").max(48),
})

export type PurchaseInput = z.infer<typeof purchaseSchema>

export const payInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  accountId: z.uuid("Selecione a conta de pagamento."),
})

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>
