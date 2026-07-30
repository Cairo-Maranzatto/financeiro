import { WhatsappLinkSettings } from "@/features/identity/components/whatsapp-link-settings"

type PageProps = {
  searchParams: Promise<{
    phone?: string
  }>
}

export default async function WhatsappSettingsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const prefillPhone = params.phone?.trim() ?? ""

  return <WhatsappLinkSettings prefillPhone={prefillPhone} />
}
