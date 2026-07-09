import { describe, expect, it } from "vitest"
import { computeFinancialIndicators } from "./financial-indicators"

describe("computeFinancialIndicators", () => {
  it("computes all three indicators for a typical month", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 4000,
      monthIncome: 5000,
      housingTotal: 1500,
      uncategorizedTotal: 200,
    })

    expect(result.categorizationRate).toBeCloseTo(95, 1) // (4000-200)/4000
    expect(result.housingCommitment).toBeCloseTo(30, 1) // 1500/5000
    expect(result.savingsRate).toBeCloseTo(20, 1) // (5000-4000)/5000
  })

  it("returns null (never NaN/Infinity) when there is no income in the month", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 1000,
      monthIncome: 0,
      housingTotal: 300,
      uncategorizedTotal: 0,
    })

    expect(result.housingCommitment).toBeNull()
    expect(result.savingsRate).toBeNull()
    // categorizationRate depends only on expenses, unaffected by zero income
    expect(result.categorizationRate).toBe(100)
  })

  it("returns null categorizationRate when there are no expenses in the month", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 0,
      monthIncome: 3000,
      housingTotal: 0,
      uncategorizedTotal: 0,
    })

    expect(result.categorizationRate).toBeNull()
    expect(result.housingCommitment).toBe(0)
    expect(result.savingsRate).toBe(100)
  })

  it("returns null for every indicator when there is no income and no expenses", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 0,
      monthIncome: 0,
      housingTotal: 0,
      uncategorizedTotal: 0,
    })

    expect(result.categorizationRate).toBeNull()
    expect(result.housingCommitment).toBeNull()
    expect(result.savingsRate).toBeNull()
  })

  it("handles 100% uncategorized expenses (0% categorization)", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 500,
      monthIncome: 1000,
      housingTotal: 0,
      uncategorizedTotal: 500,
    })

    expect(result.categorizationRate).toBe(0)
  })

  it("clamps categorizationRate at 0 even if uncategorizedTotal exceeds monthExpenses (data anomaly)", () => {
    const result = computeFinancialIndicators({
      monthExpenses: 100,
      monthIncome: 1000,
      housingTotal: 0,
      uncategorizedTotal: 150,
    })

    expect(result.categorizationRate).toBe(0)
  })
})
