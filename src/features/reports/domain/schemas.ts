import { z } from "zod"

export const reportFiltersSchema = z.object({
  start: z.string(), // ISO date string
  endExclusive: z.string(), // ISO date string
  timezone: z.string().default("UTC"),
  currency: z.string().optional(),
  categoryLevel: z.enum(["parent", "child"]).default("parent"),
  trendInterval: z.enum(["day", "week", "month"]).default("month"),
  accountId: z.string().optional(),
  description: z.string().optional(),
})

export type ReportFilters = z.infer<typeof reportFiltersSchema>
