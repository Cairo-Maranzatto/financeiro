import {
  Banknote,
  TrendingUp,
  Landmark,
  PlusCircle,
  Home,
  Utensils,
  Car,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Users,
  Briefcase,
  Receipt,
  Monitor,
  PiggyBank,
  CircleEllipsis,
  Flag,
  Shapes,
  type LucideIcon,
} from "lucide-react"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  "trending-up": TrendingUp,
  landmark: Landmark,
  "plus-circle": PlusCircle,
  home: Home,
  utensils: Utensils,
  car: Car,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  users: Users,
  briefcase: Briefcase,
  receipt: Receipt,
  monitor: Monitor,
  "piggy-bank": PiggyBank,
  "circle-ellipsis": CircleEllipsis,
  flag: Flag,
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

export function CategoryIcon({
  icon,
  className,
}: {
  icon?: string | null
  className?: string
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Shapes
  return <Icon className={className} />
}
