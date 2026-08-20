import * as React from "react"
import { Metadata } from "next"
import { ReportsView } from "@/features/reports/components/reports-view"

export const metadata: Metadata = {
  title: "Relatórios | Financeiro",
  description: "Análise financeira avançada",
}

export default function ReportsPage() {
  return <ReportsView />
}
