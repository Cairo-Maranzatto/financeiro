"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { CategoryIcon } from "@/shared/ui/category-icon"
import type { Category } from "@/features/transactions/api/categories"

interface CategorySelectProps {
  categories: Category[]
  value?: string
  onChange: (value: string) => void
  /** Predicate aplicado às categorias selecionáveis (filtro de tipo é responsabilidade do chamador). */
  filter: (category: Category) => boolean
  /**
   * "leaf" (padrão): mostra subcategorias agrupadas por categoria-pai — usado em
   * lançamentos (transação, compra no cartão, recorrência).
   * "parent": mostra só categorias-pai, sem agrupamento — usado em orçamentos.
   */
  mode?: "leaf" | "parent"
  placeholder?: string
  disabled?: boolean
}

export function CategorySelect({
  categories,
  value,
  onChange,
  filter,
  mode = "leaf",
  placeholder = "Selecione uma categoria",
  disabled,
}: CategorySelectProps) {
  const parents = categories.filter(
    (c) => !c.parent_category_id && c.type !== "Ambas"
  )

  const selected = categories.find((c) => c.id === value)
  const selectedIcon =
    selected &&
    (selected.icon ??
      categories.find((c) => c.id === selected.parent_category_id)?.icon)

  if (mode === "parent") {
    const options = parents.filter(filter)
    return (
      <Select
        value={value ?? ""}
        disabled={disabled}
        onValueChange={(v) => {
          if (v !== null) onChange(v)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selected && (
              <span className="flex items-center gap-1.5">
                <CategoryIcon icon={selectedIcon} className="size-4" />
                {selected.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((parent) => (
            <SelectItem key={parent.id} value={parent.id}>
              <CategoryIcon icon={parent.icon} className="size-4" />
              {parent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const groups = parents
    .map((parent) => ({
      parent,
      children: categories.filter(
        (c) => c.parent_category_id === parent.id && filter(c)
      ),
    }))
    .filter((g) => g.children.length > 0)

  const specials = categories.filter(
    (c) => !c.parent_category_id && c.type === "Ambas" && filter(c)
  )

  return (
    <Select
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== null) onChange(v)
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selected && (
            <span className="flex items-center gap-1.5">
              <CategoryIcon icon={selectedIcon} className="size-4" />
              {selected.name}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.map(({ parent, children }) => (
          <SelectGroup key={parent.id}>
            <SelectLabel className="flex items-center gap-1.5">
              <CategoryIcon icon={parent.icon} className="size-3.5" />
              {parent.name}
            </SelectLabel>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id} className="pl-5">
                {child.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {specials.length > 0 && (
          <SelectGroup>
            <SelectLabel>Especiais</SelectLabel>
            {specials.map((special) => (
              <SelectItem key={special.id} value={special.id}>
                <CategoryIcon icon={special.icon} className="size-4" />
                {special.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
