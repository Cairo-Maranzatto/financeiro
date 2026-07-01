# Fase 6 — Hardening, Observabilidade e Lançamento

> Ver [INDICE.md](INDICE.md). Esta fase não entrega uma feature de negócio nova — ela fecha o MVP para uso real com dados financeiros reais. **Nunca pular esta fase antes de um lançamento de produção.**

## Objetivo

Validar que o sistema é seguro, observável e testado o suficiente para confiar dados financeiros reais a ele, e formalizar o checklist de Definition of Done (Seção 30 do planejamento macro).

## Pré-requisitos

Fases 0 a 3 (Must Have) obrigatoriamente completas. Fases 4 e 5 (Should/Could Have) são desejáveis, mas podem estar incompletas sem bloquear esta fase — desde que o que existe esteja testado.

## Passos de Desenvolvimento

### 1. Testes E2E completos (Seção 26 do planejamento macro)

1.1. Implementar em Playwright os 3 fluxos golden path:

- Cadastro → Login → Criar Conta → Registrar Despesa → saldo atualizado corretamente.
- Compra no cartão → Fechamento de fatura → Pagamento de fatura → limite restabelecido.
- Criar Orçamento → Lançar despesas → Alerta visual em 80%/100% (se Fase 4 estiver implementada; caso contrário, documentar como pendência conhecida, não como bug).
  1.2. Integrar esses testes ao pipeline de CI como gate obrigatório antes de deploy de produção.

### 2. Observabilidade

2.1. Configurar Sentry (ou equivalente): DSN via variável de ambiente, captura de erros client-side e das Route Handlers.
2.2. Revisar se as Route Handlers transacionais (`transfer`, `pay-invoice`, `close-invoices`, `generate-recurrences`) emitem logs estruturados (JSON) suficientes para depurar um incidente real sem precisar reproduzir localmente.

### 3. Segurança final

3.1. Checklist manual tabela por tabela: toda tabela de domínio tem RLS habilitado e policy testada (refazer o teste de 2 usuários da Fase 0, agora cobrindo todas as tabelas criadas nas Fases 1-5).
3.2. Confirmar que `SUPABASE_SERVICE_ROLE_KEY` nunca é referenciada em código client-side (`'use client'` ou bundle do navegador) — apenas em Route Handlers server-side.
3.3. Teste manual de penetração básico: tentar acessar/editar um registro de outro usuário manipulando `id` diretamente na URL ou no payload de uma requisição.

### 4. Auditoria e Soft Delete

4.1. Validar que os triggers de auditoria (Fase 0) populam corretamente `created_by`/`updated_by` em 100% das tabelas criadas até a Fase 5, inclusive.
4.2. Validar que nenhum endpoint ou query realiza `DELETE` físico em tabela de domínio — apenas `UPDATE deleted_at`.

### 5. Checklist de Definition of Done do MVP

5.1. Rodar item por item a Seção 30 do planejamento macro (9 critérios) e marcar formalmente cada um como atendido, com a evidência (teste automatizado, teste manual documentado, ou print).

### 6. Deploy de Produção

6.1. Promover o ambiente de produção (Vercel + Supabase), aplicar as migrations finais via pipeline (nunca manualmente).
6.2. Smoke test manual pós-deploy: cadastro real, criação de conta real, um lançamento real.

### 7. Documentação mínima

7.1. README com: passos de setup local, lista de variáveis de ambiente necessárias (sem valores), comandos de migration, comando para rodar os testes.

## Critérios de Conclusão da Fase 6 (= Conclusão do MVP)

- [ ] Todos os 9 itens da Seção 30 (DoD) do planejamento macro checados com evidência.
- [ ] Pipeline de CI verde, incluindo os testes E2E.
- [ ] Deploy de produção acessível e funcional com pelo menos um usuário real testando dados reais.
- [ ] Nenhuma chave sensível (`service_role`) exposta no bundle client-side.

## Riscos Específicos desta Fase

- A tentação de "pular o checklist porque já testei manualmente durante o desenvolvimento" é o principal risco aqui — o checklist existe justamente porque validações ad-hoc durante o desenvolvimento das Fases 1-5 não cobrem interação entre módulos (ex: RLS de uma tabela da Fase 5 nunca testado com 2 usuários reais).
- Lançar sem Sentry/observabilidade configurado significa que o primeiro bug em produção será descoberto pelo usuário relatando, não pelo sistema alertando — não tratar isso como opcional.
