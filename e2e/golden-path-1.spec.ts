import { test, expect } from "@playwright/test"

const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD

test.describe("Golden Path 1: Auth → Conta → Transação", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }

    // Login
    await page.goto("/login")
    await page.getByLabel(/e-?mail/i).fill(EMAIL)
    await page.getByLabel(/senha/i).fill(PASSWORD)
    await page.getByRole("button", { name: /entrar/i }).click()
    await page.waitForURL("**/dashboard", { timeout: 10_000 })
  })

  test("dashboard carrega após login", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /dashboard|resumo/i })
    ).toBeVisible()
  })

  test("cria conta bancária e verifica na lista", async ({ page }) => {
    const accountName = `Conta Teste ${Date.now()}`

    await page.goto("/contas/nova")
    await page.getByLabel(/nome/i).fill(accountName)
    await page.getByLabel(/saldo inicial/i).fill("1000")
    await page.getByRole("button", { name: /criar/i }).click()

    await page.goto("/contas")
    await expect(page.getByText(accountName)).toBeVisible()
  })

  test("registra transação de despesa", async ({ page }) => {
    await page.goto("/transacoes/nova")
    await page.getByLabel(/descrição/i).fill("Supermercado E2E")
    await page.getByLabel(/valor/i).fill("150.50")

    // Seleciona tipo Despesa se não estiver selecionado por padrão
    const tipoSelect = page.getByLabel(/tipo/i)
    if (await tipoSelect.isVisible()) {
      await tipoSelect.selectOption("despesa")
    }

    await page.getByRole("button", { name: /salvar|registrar/i }).click()

    await expect(page.getByText("Supermercado E2E")).toBeVisible({
      timeout: 5_000,
    })
  })
})
