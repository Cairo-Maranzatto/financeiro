import { test, expect } from "@playwright/test"

const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD

test.describe("Golden Path 2: Cartão de Crédito → Fatura → Pagamento", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }

    await page.goto("/login")
    await page.getByLabel(/e-?mail/i).fill(EMAIL)
    await page.getByLabel(/senha/i).fill(PASSWORD)
    await page.getByRole("button", { name: /entrar/i }).click()
    await page.waitForURL("**/dashboard", { timeout: 10_000 })
  })

  test("página de cartões carrega", async ({ page }) => {
    await page.goto("/cartoes")
    await expect(
      page.getByRole("heading", { name: /cart[ãa]o|cart[õo]es/i })
    ).toBeVisible()
  })

  test("cria cartão de crédito", async ({ page }) => {
    const cardName = `Cartão E2E ${Date.now()}`

    await page.goto("/cartoes/novo")
    await page.getByLabel(/nome/i).fill(cardName)
    await page.getByLabel(/limite/i).fill("5000")

    const diaFechamento = page.getByLabel(/fechamento|dia de fechamento/i)
    if (await diaFechamento.isVisible()) await diaFechamento.fill("25")

    const diaVencimento = page.getByLabel(/vencimento|dia de vencimento/i)
    if (await diaVencimento.isVisible()) await diaVencimento.fill("5")

    await page.getByRole("button", { name: /criar|salvar/i }).click()

    await page.goto("/cartoes")
    await expect(page.getByText(cardName)).toBeVisible()
  })

  test("página de fatura abre corretamente", async ({ page }) => {
    await page.goto("/cartoes")
    const faturaLink = page
      .getByRole("link", { name: /fatura|ver detalhes/i })
      .first()
    if (await faturaLink.isVisible()) {
      await faturaLink.click()
      await expect(page.getByRole("heading", { name: /fatura/i })).toBeVisible()
    } else {
      test.skip()
    }
  })
})
