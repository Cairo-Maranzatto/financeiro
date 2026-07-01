import { test, expect } from "@playwright/test"

const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD

test.describe("Golden Path 3: Orçamento → Despesa → Alerta Visual", () => {
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

  test("página de planejamento carrega", async ({ page }) => {
    await page.goto("/planejamento")
    await expect(
      page.getByRole("heading", { name: /planejamento|or[çc]amento/i })
    ).toBeVisible()
  })

  test("cria orçamento e verifica card na lista", async ({ page }) => {
    await page.goto("/planejamento/orcamento/novo")

    // Seleciona categoria
    const categorySelect = page.getByLabel(/categoria/i)
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 })
    }

    await page.getByLabel(/limite/i).fill("200")
    await page.getByRole("button", { name: /criar|salvar/i }).click()

    await page.goto("/planejamento")
    await expect(page.getByText(/200/)).toBeVisible()
  })

  test("página de metas carrega", async ({ page }) => {
    await page.goto("/metas")
    await expect(page.getByRole("heading", { name: /metas/i })).toBeVisible()
  })

  test("cria meta financeira", async ({ page }) => {
    const goalName = `Meta E2E ${Date.now()}`

    await page.goto("/metas/nova")
    await page.getByLabel(/nome/i).fill(goalName)
    await page.getByLabel(/valor alvo|target/i).fill("10000")
    await page.getByRole("button", { name: /criar|salvar/i }).click()

    await page.goto("/metas")
    await expect(page.getByText(goalName)).toBeVisible()
  })

  test("página de empréstimos carrega", async ({ page }) => {
    await page.goto("/emprestimos")
    await expect(
      page.getByRole("heading", { name: /empr[ée]stimo/i })
    ).toBeVisible()
  })
})
