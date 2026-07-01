export interface LoanInstallment {
  installmentNumber: number
  amount: number
  dueDate: string
}

/**
 * Tabela Price (Sistema Francês de Amortização).
 * Para taxa = 0, faz divisão linear simples.
 * monthlyRatePct: taxa mensal em % (ex: 2.5 para 2,5% a.m.)
 * firstDueDateStr: data da 1ª parcela no formato YYYY-MM-DD
 */
export function calcLoanInstallments(
  principal: number,
  monthlyRatePct: number,
  count: number,
  firstDueDateStr: string
): LoanInstallment[] {
  const r = monthlyRatePct / 100

  const pmt =
    r === 0
      ? principal / count
      : (principal * r) / (1 - Math.pow(1 + r, -count))

  const base = new Date(firstDueDateStr + "T00:00:00")
  const result: LoanInstallment[] = []

  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setMonth(base.getMonth() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    result.push({
      installmentNumber: i + 1,
      amount: parseFloat(pmt.toFixed(8)),
      dueDate: `${yyyy}-${mm}-${dd}`,
    })
  }

  return result
}

export function totalLoanAmount(installments: LoanInstallment[]): number {
  return installments.reduce((s, i) => s + i.amount, 0)
}
