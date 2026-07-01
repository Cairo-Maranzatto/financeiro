# Índice de Fases de Desenvolvimento — MVP

Este diretório contém o plano de execução do MVP, derivado do [PLANEJAMENTO_SISTEMA_FINANCEIRO.md](../PLANEJAMENTO_SISTEMA_FINANCEIRO.md) (versão refinada, Seções 1-31). Cada fase é sequencial e depende da conclusão da(s) anterior(es), salvo indicação contrária.

| Fase | Arquivo                                                              | Objetivo                                                          | Prioridade (MoSCoW, Seção 21) |
| ---- | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| 0    | [FASE_00_FUNDACAO.md](FASE_00_FUNDACAO.md)                           | Stack, Supabase, RLS, auditoria, soft delete, CI/CD, autenticação | Must Have (base)              |
| 1    | [FASE_01_CORE_LEDGER.md](FASE_01_CORE_LEDGER.md)                     | Contas, Categorias, Transações, Transferências                    | Must Have                     |
| 2    | [FASE_02_CARTOES_CREDITO.md](FASE_02_CARTOES_CREDITO.md)             | Cartões, Faturas, Parcelamentos, Pagamento de Fatura              | Must Have                     |
| 3    | [FASE_03_DASHBOARD_PWA.md](FASE_03_DASHBOARD_PWA.md)                 | Dashboard Principal, Patrimônio por moeda, PWA instalável         | Must Have                     |
| 4    | [FASE_04_PLANNING_RECORRENCIAS.md](FASE_04_PLANNING_RECORRENCIAS.md) | Orçamentos, Recorrências, Mês Financeiro customizável             | Should Have                   |
| 5    | [FASE_05_PASSIVOS_METAS_BUSCA.md](FASE_05_PASSIVOS_METAS_BUSCA.md)   | Empréstimos, Metas Financeiras, Busca Global                      | Could Have                    |
| 6    | [FASE_06_HARDENING_LANCAMENTO.md](FASE_06_HARDENING_LANCAMENTO.md)   | Testes E2E, observabilidade, segurança, deploy de produção        | Fechamento do MVP             |

## Como usar estes arquivos

- Cada fase tem: Objetivo, Pré-requisitos, Passos de Desenvolvimento (numerados), Critérios de Conclusão e Riscos Específicos.
- As Fases 0, 1, 2 e 3 fecham o backlog **Must Have** — é o menor sistema utilizável de verdade.
- As Fases 4 e 5 (**Should/Could Have**) podem ser adiadas ou reordenadas entre si se o prazo apertar, sem comprometer o lançamento.
- A **Fase 6 nunca deve ser pulada** antes de um lançamento com dados financeiros reais — é onde o checklist de Definition of Done (Seção 30 do planejamento macro) é validado.
- Convenções de nomenclatura de tabelas, decisões de stack e Value Objects citados aqui são os fechados nas Seções 25-29 do planejamento macro — consulte-o em caso de dúvida antes de inventar uma nova convenção.
