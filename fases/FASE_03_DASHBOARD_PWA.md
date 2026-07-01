# Fase 3 — Dashboard Principal & PWA Mobile-First

> Bounded Context: Analytics & Wealth. Ver [INDICE.md](INDICE.md). Esta fase fecha o último item "Must Have" do backlog (Seção 21 do planejamento macro).

## Objetivo

Entregar a visão consolidada (Dashboard) e tornar o app de fato instalável e usável como PWA mobile-first — sem isso, o MVP não está pronto mesmo com Core Ledger e Cartões funcionando.

## Pré-requisitos

Fases 0, 1 e 2 completas (a agregação depende de `accounts`, `transactions` e `invoices` populadas).

## Passos de Desenvolvimento

### 1. Agregações (Seção 19 do planejamento macro)

1.1. MVP: queries SQL agregadas (`SUM`/`GROUP BY`) — ainda não materialized views (reservado para quando o volume de dados justificar).
1.2. Criar `GET /api/dashboard/summary` (Route Handler) consolidando em uma única resposta:

- Saldo por conta e por moeda (reaproveitando `get_account_balance` da Fase 1).
- Total de gastos do mês corrente, respeitando o mês financeiro do usuário (ver passo 2).
- Top 5 categorias por gasto no período.
  1.3. Cachear a resposta no client via TanStack Query (`staleTime` configurado por período — ex: 1 minuto).

### 2. Função única de resolução do Mês Financeiro

2.1. Implementar `resolveFinancialMonth(date: Date, startDay: number): DateRange` em `/src/shared/domain` — função pura, testável, usada **tanto** pelo Dashboard quanto pelos Orçamentos da Fase 4 (Seção 29: nunca duplicar essa regra).
2.2. Usar essa função para filtrar "gastos do mês" no passo 1.2.

### 3. Patrimônio Líquido segregado por moeda (decisão fechada — Seção 29)

3.1. Um card por moeda (BRL, USD, BTC) = soma dos saldos das `accounts` daquela moeda. Sem taxa de câmbio, sem consolidação em um único número.
3.2. Não exibir nenhuma BTC/USD convertida para BRL — isso violaria a decisão de produto já validada.

### 4. UI do Dashboard (`/src/features/dashboard`)

4.1. Mobile-first: cards de saldo por moeda no topo, gráfico de gastos por categoria (biblioteca leve, ex. `recharts`), lista das últimas transações.
4.2. Testar o layout em viewport de 360px de largura (menor Android comum) sem quebras.

### 5. PWA completo

5.1. Service Worker com estratégia _stale-while-revalidate_ para as chamadas de leitura do Dashboard (cache parcial de leitura — Seção 21 Should/Won't Have, Seção 25).
5.2. Testar instalação via "Adicionar à tela inicial" no Android (Chrome). Documentar no README as limitações conhecidas no iOS/Safari (Risco 3, Seção 24) em vez de tentar contorná-las no MVP.

### 6. Performance

6.1. Validar tempo de resposta de `/api/dashboard/summary` abaixo de 1s com um dataset de teste de ~1000 transações (gerar dados fake via script de seed).
6.2. Se exceder 1s, considerar índices adicionais em `transactions(user_id, occurred_at, status)` antes de qualquer solução mais complexa (materialized view fica para quando o volume real justificar — não otimizar prematuramente).

## Critérios de Conclusão da Fase 3

- [ ] Dashboard carrega saldo por moeda e gastos do mês corrente em menos de 1s percebido.
- [ ] App é instalável via "Adicionar à tela inicial" no Android.
- [ ] Layout funciona sem quebras visuais em telas de 360px de largura.
- [ ] Gastos do mês respeitam o `financial_month_start_day` configurado pelo usuário (testado com um valor diferente de 1).

## Riscos Específicos desta Fase

- Tentar resolver "patrimônio consolidado" via conversão de moeda informal (ex: hardcode de uma cotação) reabre uma decisão de produto já fechada (Seção 29) — não fazer, mesmo que pareça uma melhoria de UX.
- Cache do TanStack Query com `staleTime` mal calibrado pode mostrar saldo desatualizado logo após um pagamento de fatura ou transferência — garantir que as mutações da Fase 1/2 invalidam explicitamente as queries do Dashboard.
