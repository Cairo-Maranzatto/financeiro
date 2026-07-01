export interface DateRange {
  start: Date
  endExclusive: Date
}

function daysInMonth(year: number, month: number): number {
  // month is 0-indexed; new Date(y, m+1, 0) gives last day of month m
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Returns the [start, endExclusive) date range of the financial month containing `date`.
 *
 * The financial month starts on `startDay` of each calendar month.
 * `date` must already be expressed in the user's local timezone (use toDateInTimezone first).
 * `startDay` must be 1–28 (values above 28 are clamped per-month to avoid Feb overflow).
 */
export function resolveFinancialMonth(date: Date, startDay: number): DateRange {
  const d = date.getDate()
  const m = date.getMonth() // 0-indexed; JS Date handles -1/12 correctly
  const y = date.getFullYear()

  // Clamp startDay to the actual length of a given month (handles Feb + 29-31 start days)
  const clamp = (refYear: number, refMonth: number) =>
    Math.min(startDay, daysInMonth(refYear, refMonth))

  const thisStart = clamp(y, m)

  if (d >= thisStart) {
    // Current financial month: from startDay of this calendar month
    return {
      start: new Date(y, m, thisStart),
      endExclusive: new Date(y, m + 1, clamp(y, m + 1)), // JS handles m+1 > 11
    }
  } else {
    // Financial month started in the previous calendar month
    return {
      start: new Date(y, m - 1, clamp(y, m - 1)), // JS handles m-1 < 0
      endExclusive: new Date(y, m, thisStart),
    }
  }
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
