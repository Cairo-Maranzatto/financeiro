type CategoryItem = {
  category_id: string
  category_name: string
  total: number
}

type Props = {
  categories: CategoryItem[]
  currency?: string
}

export function CategoryBars({ categories, currency = "BRL" }: Props) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Sem despesas no período.</p>
    )
  }

  const max = Math.max(...categories.map((c) => c.total))

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v)

  return (
    <ul className="flex flex-col gap-3">
      {categories.map((cat) => (
        <li key={cat.category_id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{cat.category_name}</span>
            <span className="text-muted-foreground shrink-0">
              {fmt(cat.total)}
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(cat.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
