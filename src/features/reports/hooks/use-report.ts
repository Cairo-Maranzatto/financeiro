import { useQuery } from "@tanstack/react-query"
import { ReportFilters } from "../domain/schemas"
import { fetchReportData } from "../api/reports"

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReportData(filters),
    enabled: !!filters.start && !!filters.endExclusive,
  })
}
