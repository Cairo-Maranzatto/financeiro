import type { Currency } from "@/features/accounts/domain/schemas"

/**
 * Resolve em qual mês de referência uma compra cai, levando em conta o
 * dia de fechamento do cartão no timezone do usuário (Risco 2 / Seção 24).
 *
 * Regra (Seção 10): compra antes OU no dia de fechamento → fatura do mês
 * atual; depois do dia de fechamento → fatura do mês seguinte.
 */
export function resolveInvoiceMonth(
  purchaseDateInUserTz: Date,
  closingDay: number
): Date {
  const day = purchaseDateInUserTz.getDate()
  const month = purchaseDateInUserTz.getMonth()
  const year = purchaseDateInUserTz.getFullYear()

  // Dia efetivo de fechamento neste mês (pode ser menor que closingDay
  // quando o mês tem menos dias, ex: fechamento dia 28 em fevereiro de ano
  // não-bissexto permanece no dia 28).
  const effectiveClosingDay = Math.min(closingDay, daysInMonth(year, month))

  if (day <= effectiveClosingDay) {
    return new Date(year, month, 1)
  } else {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    return new Date(nextYear, nextMonth, 1)
  }
}

/** Data de fechamento da fatura de um dado mês de referência. */
export function resolveClosingDate(
  referenceMonth: Date,
  closingDay: number
): Date {
  const year = referenceMonth.getFullYear()
  const month = referenceMonth.getMonth()
  const effective = Math.min(closingDay, daysInMonth(year, month))
  return new Date(year, month, effective)
}

/** Data de vencimento: no mês seguinte ao fechamento, no dueDay do cartão. */
export function resolveDueDate(closingDate: Date, dueDay: number): Date {
  const nextMonth =
    closingDate.getMonth() === 11 ? 0 : closingDate.getMonth() + 1
  const nextYear =
    closingDate.getMonth() === 11
      ? closingDate.getFullYear() + 1
      : closingDate.getFullYear()
  const effective = Math.min(dueDay, daysInMonth(nextYear, nextMonth))
  return new Date(nextYear, nextMonth, effective)
}

export interface Installment {
  /** Mês de referência da fatura (primeiro dia do mês). */
  referenceMonth: Date
  closingDate: Date
  dueDate: Date
  /** Valor desta parcela (positivo; sign aplicado ao inserir na transactions). */
  amount: number
  currency: Currency
  /** Data de ocorrência desta parcela (purchaseDate + (n-1) meses). */
  occurredAt: Date
}

/**
 * Calcula as N parcelas de uma compra parcelada, respeitando o dia de
 * fechamento e distribuindo centavos corretamente (resto na 1ª parcela).
 *
 * Critério de aceite da Fase 2: sum(parcelas) === totalAmount, ao centavo.
 */
export function buildInstallments(
  purchaseDateInUserTz: Date,
  totalAmount: number,
  currency: Currency,
  installmentCount: number,
  card: { closingDay: number; dueDay: number }
): Installment[] {
  if (installmentCount < 1) throw new Error("Número de parcelas deve ser >= 1.")
  if (totalAmount <= 0) throw new Error("Valor da compra deve ser positivo.")

  const base = Math.trunc((totalAmount * 1e8) / installmentCount)
  const remainder = Math.round(totalAmount * 1e8) - base * installmentCount

  const installments: Installment[] = []

  for (let i = 0; i < installmentCount; i++) {
    const installmentDate = addMonths(purchaseDateInUserTz, i)
    const refMonth = resolveInvoiceMonth(installmentDate, card.closingDay)
    const closingDate = resolveClosingDate(refMonth, card.closingDay)
    const dueDate = resolveDueDate(closingDate, card.dueDay)
    const rawAmount = i === 0 ? base + remainder : base

    installments.push({
      referenceMonth: refMonth,
      closingDate,
      dueDate,
      amount: rawAmount / 1e8,
      currency,
      occurredAt: installmentDate,
    })
  }

  return installments
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}
