"use client"

import { cn } from "@/shared/lib/utils"

interface CurrencyInputProps {
  value?: number
  onChange: (value: number) => void
  currency?: string
  id?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Shared class matching the shadcn Input component for consistent styling
export const INPUT_CLASS =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

// Compact class for forms using plain <input> elements
export const INPUT_PLAIN_CLASS = "rounded-md border px-3 py-2 text-sm w-full"

function formatAmount(cents: number, currency: string): string {
  const locales: Record<string, string> = { BRL: "pt-BR", USD: "pt-BR" }
  return new Intl.NumberFormat(locales[currency] ?? "pt-BR", {
    style: "currency",
    currency: currency === "BTC" ? "BRL" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/**
 * Controlled currency input with BRL-style masking (cents-from-right).
 * For BTC, renders a plain number input.
 * Integrates with react-hook-form via Controller: pass field.value and field.onChange.
 */
export function CurrencyInput({
  value,
  onChange,
  currency = "BRL",
  id,
  placeholder,
  className,
  disabled,
}: CurrencyInputProps) {
  const baseClass = cn(INPUT_CLASS, className)

  if (currency === "BTC") {
    return (
      <input
        id={id}
        type="number"
        step="0.00000001"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder ?? "0.00000000"}
        className={baseClass}
        disabled={disabled}
      />
    )
  }

  const cents = Math.round((value ?? 0) * 100)
  const displayValue = cents === 0 ? "" : formatAmount(cents, currency)
  const defaultPlaceholder = currency === "USD" ? "US$ 0,00" : "R$ 0,00"

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "")
    const newCents = digits === "" ? 0 : parseInt(digits, 10)
    onChange(newCents / 100)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder ?? defaultPlaceholder}
      className={baseClass}
      disabled={disabled}
    />
  )
}
