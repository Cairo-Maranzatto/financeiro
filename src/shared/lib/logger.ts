type Level = "info" | "warn" | "error"

/**
 * Logger estruturado (JSON) para Route Handlers.
 * Em produção, os logs são capturados pelo runtime da Vercel.
 */
export function log(
  level: Level,
  event: string,
  meta?: Record<string, unknown>
): void {
  const entry = JSON.stringify({
    level,
    event,
    ...meta,
    ts: new Date().toISOString(),
  })
  if (level === "error") console.error(entry)
  else if (level === "warn") console.warn(entry)
  else console.log(entry)
}
