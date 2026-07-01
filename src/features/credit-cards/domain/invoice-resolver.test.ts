import { describe, expect, it } from "vitest"

import { buildInstallments, resolveInvoiceMonth } from "./invoice-resolver"

const card = { closingDay: 15, dueDay: 10 }

describe("resolveInvoiceMonth", () => {
  it("compra antes do fechamento → fatura do mês corrente", () => {
    const result = resolveInvoiceMonth(new Date(2026, 5, 10), 15) // 10 jun
    expect(result).toEqual(new Date(2026, 5, 1)) // jun/2026
  })

  it("compra exatamente no dia de fechamento → fatura do mês corrente", () => {
    const result = resolveInvoiceMonth(new Date(2026, 5, 15), 15) // 15 jun
    expect(result).toEqual(new Date(2026, 5, 1)) // jun/2026
  })

  it("compra após o fechamento → fatura do mês seguinte", () => {
    const result = resolveInvoiceMonth(new Date(2026, 5, 16), 15) // 16 jun
    expect(result).toEqual(new Date(2026, 6, 1)) // jul/2026
  })

  it("virada de ano: compra em dezembro após fechamento → fatura de janeiro do ano seguinte", () => {
    const result = resolveInvoiceMonth(new Date(2026, 11, 20), 15) // 20 dez
    expect(result).toEqual(new Date(2027, 0, 1)) // jan/2027
  })

  it("fechamento dia 28 em fevereiro (não-bissexto) → efetivo no último dia do mês", () => {
    // Fevereiro de 2026 tem 28 dias; closingDay=28, compra no dia 28 → fatura de fevereiro
    const result = resolveInvoiceMonth(new Date(2026, 1, 28), 28)
    expect(result).toEqual(new Date(2026, 1, 1)) // fev/2026
  })
})

describe("buildInstallments", () => {
  it("compra à vista gera 1 parcela com valor total exato", () => {
    const installments = buildInstallments(
      new Date(2026, 5, 10),
      100,
      "BRL",
      1,
      card
    )
    expect(installments).toHaveLength(1)
    expect(installments[0].amount).toBeCloseTo(100, 8)
  })

  it("soma de N parcelas == valor total ao centavo (sem perder nem inventar centavos)", () => {
    const total = 100
    const n = 3
    const installments = buildInstallments(
      new Date(2026, 5, 10),
      total,
      "BRL",
      n,
      card
    )
    const sum = installments.reduce(
      (acc, p) => acc + Math.round(p.amount * 1e8),
      0
    )
    expect(sum).toBe(Math.round(total * 1e8))
  })

  it("valor indivisível: resto vai para a 1ª parcela", () => {
    const installments = buildInstallments(
      new Date(2026, 5, 10),
      0.1,
      "BRL",
      3,
      card
    )
    const values = installments.map((p) => Math.round(p.amount * 1e8))
    const sum = values.reduce((a, b) => a + b, 0)
    expect(sum).toBe(Math.round(0.1 * 1e8))
    // 1ª parcela absorve o resto
    expect(values[0]).toBeGreaterThanOrEqual(values[1])
  })

  it("3 parcelas com fechamento passado geram faturas em meses subsequentes corretos", () => {
    // Compra em 20 jun (após fechamento dia 15) → 1ª fatura = jul, 2ª = ago, 3ª = set
    const installments = buildInstallments(
      new Date(2026, 5, 20),
      300,
      "BRL",
      3,
      card
    )
    expect(installments[0].referenceMonth).toEqual(new Date(2026, 6, 1)) // jul
    expect(installments[1].referenceMonth).toEqual(new Date(2026, 7, 1)) // ago
    expect(installments[2].referenceMonth).toEqual(new Date(2026, 8, 1)) // set
  })

  it("lança erro se installmentCount < 1", () => {
    expect(() => buildInstallments(new Date(), 100, "BRL", 0, card)).toThrow()
  })

  it("lança erro se totalAmount <= 0", () => {
    expect(() => buildInstallments(new Date(), -10, "BRL", 1, card)).toThrow()
  })
})
