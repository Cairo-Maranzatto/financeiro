export type Currency = "BRL" | "USD" | "BTC"

export interface Money {
  amount: number
  currency: Currency
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { amount: a.amount + b.amount, currency: a.currency }
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { amount: a.amount - b.amount, currency: a.currency }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Não é possível operar entre moedas diferentes: ${a.currency} e ${b.currency}.`
    )
  }
}
