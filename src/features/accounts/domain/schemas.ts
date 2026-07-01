import { z } from "zod"

export const currencySchema = z.enum(["BRL", "USD", "BTC"])
export type Currency = z.infer<typeof currencySchema>

export const createAccountSchema = z.object({
  name: z.string().min(1, "Informe um nome para a conta."),
  currency: currencySchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  initialBalance: z.coerce.number().default(0),
  occurredAt: z.string().min(1, "Informe a data do saldo inicial."),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
