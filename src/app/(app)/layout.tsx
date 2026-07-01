import { AppHeader } from "@/shared/components/app-header"

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4">{children}</main>
    </div>
  )
}
