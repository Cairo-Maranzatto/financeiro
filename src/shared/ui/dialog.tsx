"use client"

import { X } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "bg-card relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-lg",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          {title ? (
            <h2 className="text-lg font-semibold">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
