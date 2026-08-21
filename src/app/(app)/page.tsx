import { ReportsView } from "@/features/reports/components/reports-view"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | Financeiro",
  description: "Visão geral e relatórios financeiros",
}

export default function Home() {
  return <ReportsView />
}
