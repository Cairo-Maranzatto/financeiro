import { describe, expect, it } from "vitest"
import { resolveFinancialMonth } from "./financial-month"

// Helper: creates a Date in local time (no timezone conversion)
const d = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day)

describe("resolveFinancialMonth", () => {
  describe("startDay = 1 (calendar month)", () => {
    it("mid-month returns the current calendar month", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 15), 1)
      expect(start).toEqual(d(2026, 7, 1))
      expect(endExclusive).toEqual(d(2026, 8, 1))
    })

    it("first day of month is included in this month (boundary)", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 1), 1)
      expect(start).toEqual(d(2026, 7, 1))
      expect(endExclusive).toEqual(d(2026, 8, 1))
    })

    it("year wrap: December → January", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 12, 20), 1)
      expect(start).toEqual(d(2026, 12, 1))
      expect(endExclusive).toEqual(d(2027, 1, 1))
    })
  })

  describe("startDay = 5", () => {
    it("day >= startDay returns this financial month", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 15), 5)
      expect(start).toEqual(d(2026, 7, 5))
      expect(endExclusive).toEqual(d(2026, 8, 5))
    })

    it("day exactly = startDay (boundary inclusive)", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 5), 5)
      expect(start).toEqual(d(2026, 7, 5))
      expect(endExclusive).toEqual(d(2026, 8, 5))
    })

    it("day < startDay returns previous financial month", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 3), 5)
      expect(start).toEqual(d(2026, 6, 5))
      expect(endExclusive).toEqual(d(2026, 7, 5))
    })

    it("day = startDay - 1 (boundary exclusive)", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 7, 4), 5)
      expect(start).toEqual(d(2026, 6, 5))
      expect(endExclusive).toEqual(d(2026, 7, 5))
    })

    it("year wrap: Jan 3 → financial month is Dec 5 – Jan 5", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 1, 3), 5)
      expect(start).toEqual(d(2025, 12, 5))
      expect(endExclusive).toEqual(d(2026, 1, 5))
    })

    it("year wrap: Dec 20 → financial month is Dec 5 – Jan 5", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 12, 20), 5)
      expect(start).toEqual(d(2026, 12, 5))
      expect(endExclusive).toEqual(d(2027, 1, 5))
    })
  })

  describe("startDay clamping for short months", () => {
    it("startDay = 30, February: clamps to Feb 28", () => {
      // 2026 is not a leap year, so Feb has 28 days
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 2, 15), 30)
      // Feb 15 < Feb 28 (clamped) → financial month started Jan 30
      expect(start).toEqual(d(2026, 1, 30))
      expect(endExclusive).toEqual(d(2026, 2, 28))
    })

    it("startDay = 30, March 5 (day < 30): financial month is Feb 28 – Mar 30", () => {
      const { start, endExclusive } = resolveFinancialMonth(d(2026, 3, 5), 30)
      expect(start).toEqual(d(2026, 2, 28))
      expect(endExclusive).toEqual(d(2026, 3, 30))
    })

    it("startDay = 28, Feb leap year: uses 28 (no clamp needed)", () => {
      // 2028 is a leap year (Feb has 29 days), startDay=28 ≤ 29 → no clamp
      const { start, endExclusive } = resolveFinancialMonth(d(2028, 2, 28), 28)
      expect(start).toEqual(d(2028, 2, 28))
      expect(endExclusive).toEqual(d(2028, 3, 28))
    })
  })

  describe("endExclusive is always the start of the next financial month", () => {
    it("the range is contiguous: no gap between consecutive months", () => {
      const month1 = resolveFinancialMonth(d(2026, 6, 20), 10) // June 20 → Jun 10–Jul 10
      const month2 = resolveFinancialMonth(d(2026, 7, 20), 10) // Jul 20 → Jul 10–Aug 10
      expect(month1.endExclusive).toEqual(month2.start)
    })
  })
})
