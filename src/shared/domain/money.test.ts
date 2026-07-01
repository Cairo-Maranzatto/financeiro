import { describe, expect, it } from "vitest"

import { add, subtract, type Money } from "@/shared/domain/money"

describe("Money", () => {
  it("soma valores na mesma moeda", () => {
    const a: Money = { amount: 100, currency: "BRL" }
    const b: Money = { amount: 50, currency: "BRL" }

    expect(add(a, b)).toEqual({ amount: 150, currency: "BRL" })
  })

  it("subtrai valores na mesma moeda", () => {
    const a: Money = { amount: 100, currency: "USD" }
    const b: Money = { amount: 30, currency: "USD" }

    expect(subtract(a, b)).toEqual({ amount: 70, currency: "USD" })
  })

  it("lança erro ao somar moedas diferentes", () => {
    const a: Money = { amount: 100, currency: "BRL" }
    const b: Money = { amount: 1, currency: "BTC" }

    expect(() => add(a, b)).toThrow(/moedas diferentes/)
  })

  it("lança erro ao subtrair moedas diferentes", () => {
    const a: Money = { amount: 100, currency: "USD" }
    const b: Money = { amount: 1, currency: "BTC" }

    expect(() => subtract(a, b)).toThrow(/moedas diferentes/)
  })
})
