import type { DashboardSummary } from "@/features/dashboard/api/dashboard"
import { cn } from "@/shared/lib/utils"

type Props = {
  alerts: DashboardSummary["alerts"]
}

export function DashboardAlerts({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">Alertas e insights</h3>
        <p className="text-muted-foreground text-sm">
          Sem alertas críticos neste período.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">Alertas e insights</h3>
      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={cn(
              "rounded-lg border p-3",
              alert.severity === "danger" &&
                "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200",
              alert.severity === "warning" &&
                "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-950/20 dark:text-yellow-200",
              alert.severity === "info" &&
                "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200"
            )}
          >
            <p className="text-sm font-semibold">{alert.title}</p>
            <p className="mt-1 text-xs opacity-90">{alert.message}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
