import { ReportData } from "../api/reports"
import { ReportFilters } from "../domain/schemas"

export function generateReportHtml(
  data: ReportData,
  filteredTransactions: {
    id: string
    amount: number
    currency: string
    type: string
    status: string
    description: string | null
    occurred_at: string
    category_id: string | null
    categories: {
      name: string
      icon: string | null
      parent_category_id: string | null
    } | null
    accounts: { name: string } | null
  }[],
  filters: ReportFilters
) {
  const todayStr = new Date().toLocaleDateString("pt-BR")
  const startStr = new Date(filters.start).toLocaleDateString("pt-BR")
  const endStr = new Date(
    new Date(filters.endExclusive).getTime() - 86400000
  ).toLocaleDateString("pt-BR")

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value)
  }

  // We generate content for each currency present in the totals
  const sections = data.totals
    .map((total) => {
      const currency = total.currency

      // Re-calculate totals based on filteredTransactions for this specific currency
      const txsInCurrency = filteredTransactions.filter(
        (tx) => tx.currency === currency
      )
      if (txsInCurrency.length === 0) return ""

      const currencyIncomeTotal = txsInCurrency
        .filter((tx) => tx.type === "receita")
        .reduce((sum, tx) => sum + tx.amount, 0)
      const currencyExpenseTotal = Math.abs(
        txsInCurrency
          .filter((tx) => tx.type === "despesa")
          .reduce((sum, tx) => sum + tx.amount, 0)
      )
      const currencyNet = currencyIncomeTotal - currencyExpenseTotal
      const currencyMargin =
        currencyIncomeTotal > 0 ? (currencyNet / currencyIncomeTotal) * 100 : 0

      return `
    <section class="summary">
      <div class="summary-card">
        <div class="summary-label">Receitas (${currency})</div>
        <div class="summary-value positive">${formatCurrency(currencyIncomeTotal, currency)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Despesas (${currency})</div>
        <div class="summary-value negative">${formatCurrency(currencyExpenseTotal, currency)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Resultado (${currency})</div>
        <div class="summary-value ${currencyNet >= 0 ? "positive" : "negative"}">${formatCurrency(currencyNet, currency)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Margem (${currency})</div>
        <div class="summary-value">${currencyMargin.toFixed(2)}%</div>
      </div>
    </section>

    <div class="section-title">Demonstração do Resultado (${currency})</div>
    <table class="dre">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr class="group">
          <td>(+) RECEITAS</td>
          <td>${formatCurrency(currencyIncomeTotal, currency)}</td>
        </tr>
        ${data.categoriesIncome
          .map((c) => {
            const catTotal = txsInCurrency
              .filter(
                (tx) =>
                  tx.type === "receita" &&
                  (filters.categoryLevel === "parent"
                    ? (tx.categories?.parent_category_id || tx.category_id) ===
                      c.category_id
                    : tx.category_id === c.category_id)
              )
              .reduce((sum, tx) => sum + tx.amount, 0)
            if (catTotal === 0) return ""
            return `
                <tr class="subcategory">
                  <td>${c.category_name}</td>
                  <td>${formatCurrency(catTotal, currency)}</td>
                </tr>
              `
          })
          .join("")}

        <tr class="group">
          <td>(-) DESPESAS</td>
          <td>${formatCurrency(currencyExpenseTotal, currency)}</td>
        </tr>
        ${data.categoriesExpense
          .map((c) => {
            const catTotal = Math.abs(
              txsInCurrency
                .filter(
                  (tx) =>
                    tx.type === "despesa" &&
                    (filters.categoryLevel === "parent"
                      ? (tx.categories?.parent_category_id ||
                          tx.category_id) === c.category_id
                      : tx.category_id === c.category_id)
                )
                .reduce((sum, tx) => sum + tx.amount, 0)
            )
            if (catTotal === 0) return ""
            return `
                <tr class="subcategory">
                  <td>${c.category_name}</td>
                  <td>${formatCurrency(catTotal, currency)}</td>
                </tr>
              `
          })
          .join("")}

        <tr class="result">
          <td>RESULTADO LÍQUIDO</td>
          <td>${formatCurrency(currencyNet, currency)}</td>
        </tr>
      </tbody>
    </table>

    <section class="indicators">
      <div class="section-title">Indicadores Financeiros (${currency})</div>
      <div class="indicator-row">
        <div>Receita total</div>
        <div class="indicator-value">${formatCurrency(currencyIncomeTotal, currency)}</div>
        <div class="indicator-percent">100,00%</div>
      </div>
      <div class="indicator-row">
        <div>Despesas totais</div>
        <div class="indicator-value">${formatCurrency(currencyExpenseTotal, currency)}</div>
        <div class="indicator-percent">${currencyIncomeTotal > 0 ? ((currencyExpenseTotal / currencyIncomeTotal) * 100).toFixed(2) : "0,00"}%</div>
      </div>
      <div class="indicator-row">
        <div>Resultado líquido</div>
        <div class="indicator-value ${currencyNet >= 0 ? "positive" : "negative"}">${formatCurrency(currencyNet, currency)}</div>
        <div class="indicator-percent">${currencyIncomeTotal > 0 ? ((currencyNet / currencyIncomeTotal) * 100).toFixed(2) : "0,00"}%</div>
      </div>
    </section>
    `
    })
    .filter(Boolean)
    .join('<div style="page-break-after: always;"></div>')

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Financeiro</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 14mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f1f3f5;
      color: #202124;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 14mm 12mm;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #222;
      margin-bottom: 18px;
    }
    .company { display: flex; flex-direction: column; gap: 3px; }
    .company-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
    .company-document { color: #666; font-size: 10px; }
    .report-info { text-align: right; }
    .report-title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
    .report-period { margin-top: 4px; color: #666; font-size: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
    .summary-card { border: 1px solid #d9d9d9; padding: 9px 10px; border-radius: 4px; }
    .summary-label { color: #666; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
    .summary-value { margin-top: 4px; font-size: 14px; font-weight: 700; }
    .positive { color: #146c43; }
    .negative { color: #b42318; }
    .section-title { margin-top: 18px; margin-bottom: 7px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .dre { width: 100%; border-collapse: collapse; }
    .dre th { padding: 7px 8px; border-top: 1px solid #222; border-bottom: 1px solid #222; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
    .dre th:last-child, .dre td:last-child { text-align: right; }
    .dre td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: middle; }
    .dre .group { font-weight: 700; background: #f5f5f5; border-top: 1px solid #cfcfcf; }
    .dre .subcategory td:first-child { padding-left: 22px; color: #555; }
    .dre .result { font-size: 12px; font-weight: 700; background: #eeeeee; border-top: 2px solid #222; border-bottom: 2px solid #222; }
    .indicators { margin-top: 22px; }
    .indicator-row { display: grid; grid-template-columns: 1fr 120px 80px; align-items: center; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
    .indicator-row:first-child { border-top: 1px solid #222; }
    .indicator-row:last-child { border-bottom: 1px solid #222; }
    .indicator-value { text-align: right; font-weight: 700; }
    .indicator-percent { text-align: right; color: #666; }
    .notes { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; color: #666; font-size: 9px; }
    .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; color: #777; font-size: 8px; }
    @media print {
      body { background: #fff; }
      .page { width: auto; min-height: auto; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; }
    }
    .print-button { position: fixed; right: 25px; bottom: 25px; padding: 10px 16px; border: none; border-radius: 6px; background: #222; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
    .print-button:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="company">
        <div class="company-name">Financeiro</div>
        <div class="company-document">Relatório de Gestão Pessoal</div>
      </div>
      <div class="report-info">
        <div class="report-title">Relatório Financeiro</div>
        <div class="report-period">Período: ${startStr} a ${endStr}</div>
      </div>
    </header>

    ${sections}

    <section class="notes">
      <strong>Observações:</strong>
      Este relatório apresenta os lançamentos financeiros registrados no período selecionado. 
      Transferências entre contas próprias não são consideradas receitas ou despesas.
      Filtros aplicados: ${filters.description ? `Busca por "${filters.description}"; ` : ""} 
      ${filters.accountId ? "Conta específica selecionada." : "Todas as contas."}
    </section>

    <footer class="footer">
      <div>Relatório gerado em ${todayStr}</div>
      <div>Sistema de Gestão Financeira</div>
    </footer>
  </main>
  <button class="print-button no-print" onclick="window.print()">
    Imprimir relatório
  </button>
</body>
</html>
  `
}
