# Planejamento Macro e Arquitetural - Sistema de Gestão Financeira

Este é um documento de planejamento macro e definição arquitetural elaborado sob a ótica conjunta de um **Software Architect Sênior, Product Owner e Tech Lead**. O foco está na modelagem de domínio, decisões arquiteturais, viabilidade técnica e estratégia de produto, garantindo que o sistema nasça simples, mas com fundações robustas para escalar como um SaaS multiusuário e tracionar automações com IA no futuro.

---

## 1. Visão do Produto

Ser o hub definitivo de inteligência financeira pessoal. O produto transforma o registro manual de finanças — muitas vezes tedioso — em uma experiência de alto valor agregado, fornecendo clareza absoluta sobre o passado, controle sobre o presente e previsibilidade sobre o futuro (patrimônio e metas). A simplicidade da interface esconde uma engenharia de dados profunda e preparada para o futuro.

## 2. Objetivos do Sistema

- **Curto Prazo (MVP):** Entregar um PWA responsivo com zero atrito de UX, permitindo controle absoluto sobre contas, cartões, orçamentos e dívidas, validando o engajamento do usuário.
- **Médio Prazo (SaaS & Escala):** Habilitar monetização, infraestrutura robusta para milhares de usuários simultâneos sem vazamento de dados (isolamento multitenant) e automações baseadas em regras.
- **Longo Prazo (IA & Ecossistema):** Transformar os dados estruturados em insights proativos via IA e integrar com Open Finance para um ecossistema autônomo.

## 3. Requisitos Funcionais (RF)

- **RF01:** O sistema deve autenticar usuários via e-mail e senha.
- **RF02:** O sistema deve gerenciar Contas (BRL, USD, BTC), Cartões de Crédito, Empréstimos e Metas.
- **RF03:** O usuário deve poder registrar receitas, despesas e transferências com categorias e subcategorias.
- **RF04:** O sistema deve calcular faturas de cartão de crédito automaticamente com base na data de corte e compras registradas (à vista ou parceladas).
- **RF05:** O sistema deve gerar lançamentos futuros baseados em regras de recorrência.
- **RF06:** O usuário deve poder configurar orçamentos e visualizar alertas visuais (80% e 100% de uso).
- **RF07:** O sistema deve calcular e exibir o Patrimônio Líquido em tempo real, segregado por moeda (BRL, USD, BTC exibidos em cards separados, sem consolidação cambial — decisão fechada na Seção 29).
- **RF08:** O sistema deve suportar configurações regionais (idioma, formato de data) e mês financeiro customizável.
- **RF09:** O sistema deve fornecer busca global (Omnisearch) cobrindo todos os módulos.

## 4. Requisitos Não Funcionais (RNF)

- **RNF01 (Disponibilidade e Hospedagem):** Hospedagem serverless na Vercel, garantindo alta disponibilidade e escalabilidade automática.
- **RNF02 (Banco de Dados):** Supabase (PostgreSQL) com isolamento lógico de inquilinos.
- **RNF03 (Precisão Financeira):** Valores monetários obrigatoriamente armazenados em `decimal(18,8)` para prevenir erros de ponto flutuante e suportar frações de criptomoedas (BTC).
- **RNF04 (Timezones):** Todas as datas de transação e auditoria armazenadas em UTC. A camada de apresentação (Frontend) resolve a exibição para horário de Brasília (ou configurado).
- **RNF05 (Auditoria):** Todos os registros devem conter `Id` (**UUIDv7** — decisão fechada: ordenação temporal nativa melhora a localidade do índice B-tree no Postgres em relação ao v4, sem expor uma sequência previsível como um `serial`), `UserId`, `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `DeletedAt`, `DeletedBy`.
- **RNF06 (Exclusão Segura):** Aplicação estrita de _Soft Delete_. Nenhum dado financeiro é apagado fisicamente.

## 5. Contextos de Domínio (Bounded Contexts - DDD)

Para evitar um monólito espaguete, dividimos o sistema nos seguintes contextos lógicos:

1.  **Identity & Access (IAM):** Autenticação, perfis, preferências do usuário.
2.  **Core Ledger (Livro-razão):** Contas, Transações, Transferências e Categorias. É o coração financeiro.
3.  **Credit Management:** Cartões de crédito, limites, faturas e parcelamentos.
4.  **Liabilities (Passivos):** Empréstimos, financiamentos e dívidas.
5.  **Planning & Tracking:** Orçamentos (Budgets) e Metas Financeiras (Goals).
6.  **Analytics & Wealth:** Cálculo de patrimônio, consolidação de dashboard e relatórios.

## 6. Módulos do Sistema (Feature First)

A arquitetura "Feature First" agrupa o código pelo seu domínio de negócio, não pela sua camada técnica.

- `Identity` (Auth, Settings)
- `Accounts` (Gestão de contas e saldos)
- `Transactions` (Despesas, Receitas, Transferências)
- `CreditCards` (Cartões, Faturas, Parcelas)
- `Planning` (Metas, Orçamentos)
- `Loans` (Empréstimos e Dívidas)
- `Dashboard` (Agregações, Gráficos)

## 7. Entidades e Agregados

- **Agregados Raiz (Aggregate Roots):**
  - `User`: Controla o ciclo de vida das configurações.
  - `Account`: Controla o saldo e as transações diretas.
  - `Category`: Sugerida ou customizada.
  - `CreditCard`: Controla a geração e o status das `Invoices` (Faturas).
  - `Goal`: Controla o progresso através de alocações financeiras.
  - `Budget`: Controla os limites contra as transações realizadas no mês.
  - `Loan`: Controla parcelas e amortizações.
- **Entidades Filhas:**
  - `Transaction` (Pertence à Conta ou à Fatura).
  - `Invoice` (Fatura, pertence ao Cartão).
  - `Installment` (Parcela, pertence a uma Transação/Fatura).

## 8. Value Objects (Objetos de Valor)

_Decisão Arquitetural:_ Utilizar VOs para garantir invariâncias de domínio e imutabilidade.

- **Money:** Encapsula o `Amount` (decimal) e a `Currency` (BRL, USD, BTC). Evita somar BRL com BTC acidentalmente.
- **DateRange:** Encapsula `StartDate` e `EndDate` (usado em faturas, orçamentos e relatórios). Garante que a data de início nunca seja maior que a de fim.
- **TransactionStatus:** Pendente, Pago, Vencido, Cancelado.
- **InvoiceStatus:** Aberta (recebendo lançamentos), Fechada (aguardando pagamento), Paga, Vencida (passou do vencimento sem pagamento integral).
- **CategoryType:** Receita, Despesa, Ambas.

## 9. Relacionamentos (Modelo Conceitual)

- **User** (1) -> (N) **Accounts, Cards, Categories, Goals, Budgets, Loans**.
- **Account** (1) -> (N) **Transactions** (Histórico direto).
- **CreditCard** (1) -> (N) **Invoices** (Geradas mensalmente).
- **Invoice** (1) -> (N) **Transactions** (Compras no cartão).
- **Category** (1) -> (N) **Subcategories**.
- **Transaction** (N) -> (1) **Category / Subcategory**.
- **Transfer** -> Relaciona duas **Transactions** (uma de saída na conta A, uma de entrada na conta B).

## 10. Regras de Negócio Críticas

- **Saldo Automático:** O saldo de uma conta não é editável diretamente pelo usuário após a criação. Ele é um campo projetado (calculado) materializado pela soma algébrica (Receitas - Despesas) de todas as `Transactions` pagas daquela conta. _Alternativa:_ Atualizar o saldo via _triggers_ no banco (alta performance) ou eventos de domínio (melhor rastreabilidade). Optaremos por **Eventos de Domínio** materializados em tempo de execução.
- **Mecânica de Cartão de Crédito:**
  - Compra feita _antes_ ou _no dia_ de fechamento -> Fatura atual.
  - Compra feita _após_ o dia de fechamento -> Próxima fatura.
  - Parcelamentos dividem o valor total, criando `Transactions` nas N faturas subsequentes.
- **Orçamentos (Budgets):** O cálculo do percentual utilizado respeita o "Mês Financeiro" configurado pelo usuário (ex: dia 5 a dia 4 do mês seguinte), e não o mês civil padrão, filtrando apenas categorias mapeadas.
- **Transferências:** São atômicas. Se a entrada na conta destino falhar (por qualquer motivo), a saída na conta origem sofre _rollback_.

## 11. Eventos de Domínio

Essenciais para desacoplamento e preparação para IA. Quando uma ação ocorre, o sistema emite:

- `TransactionCreated` / `TransactionPaid` / `TransactionCanceled` -> Atualiza saldos, metas e orçamentos via _listeners_.
- `InvoiceClosed` -> Congela a fatura e gera notificação de pagamento iminente.
- `BudgetExceeded` -> Dispara um alerta visual (ou notificação futura).
- `GoalCompleted` -> Dispara gamificação ou ajuste de planejamento.
- `RecurringTransactionGenerated` -> Evento cron (sistêmico) informando a criação de transações futuras.

## 12. Casos de Uso (Core)

- **Lançamentos:** `RegistrarDespesa`, `RegistrarReceita`, `EfetivarTransferencia`, `PagarFaturaCartao`.
- **Planejamento:** `DefinirOrcamentoMensal`, `CriarMetaFinanceira`, `AlocarRecursoNaMeta`.
- **Gestão de Passivos:** `ContratarEmprestimo`, `PagarParcelaEmprestimo`.
- **Administrativo:** `ConfigurarMesFinanceiro`, `ImportarCategoriasPadrao` (no onboarding).

## 13. Fluxos de Negócio (Exemplo: Pagamento de Fatura)

1. O usuário seleciona uma Fatura (Status: Fechada) no valor de R$ 1.500,00.
2. O sistema solicita qual `Account` (Conta origem) será usada para o pagamento.
3. O sistema cria uma `Transaction` do tipo Despesa na Conta origem, categorizada como "Pagamento de Cartão".
4. O sistema emite `TransactionPaid`.
5. O _listener_ atualiza o saldo da Conta.
6. O sistema altera o status da `Invoice` para "Paga".
7. O limite do `CreditCard` é restabelecido no valor pago.
8. O sistema emite `InvoicePaid` (útil para auditoria e IA futura).

## 14. Modelo Relacional Conceitual (Core)

A topologia das tabelas reflete:

- `users_settings`: Reflete preferências (tema, idioma).
- `accounts`: Guarda moeda e metadados — **sem** coluna de saldo. O "saldo inicial" informado na criação gera uma `Transaction` de sistema (categoria "Saldo Inicial", não editável/excluível pelo usuário), preservando a regra de saldo 100% calculado (Seção 10) sem abrir exceção.
- `categories` / `subcategories`: Hierarquia simples.
- `transactions`: É a tabela mais larga (Heavy Read/Write). Guarda polimorficamente se pertence a uma `account_id` ou `invoice_id`. Possui as colunas de auditoria.
- `transfers`: Tabela de ligação contendo `origin_transaction_id` e `destination_transaction_id`.
- `credit_cards` e `invoices`: Relação pai e filho.
- `budgets`, `goals`, `loans`: Entidades isoladas, ligadas ao usuário.

_Nota Arquitetural:_ Todos os registros levam o campo `tenant_id` (que neste sistema B2C é sinônimo de `user_id`).

## 15. Estratégia Multiusuário (SaaS)

_Decisão:_ **Single Database, Single Schema, Shared Tables com RLS.**
_Por quê?_ Criar um schema ou banco por usuário em um sistema B2C pessoal é inviável financeiramente e de difícil manutenção.
_Implementação:_ Usaremos o **Row Level Security (RLS)** nativo do Supabase (PostgreSQL). Nenhuma _query_ funcionará a menos que a sessão do banco de dados (JWT autenticado) bata com o `user_id` da linha. Isso garante que um bug na aplicação nunca vaze dados financeiros do Usuário A para o Usuário B.

## 16. Estratégia de Segurança

- **Autenticação:** JWT via Supabase Auth.
- **Autorização:** RLS no banco de dados.
- **Rastreabilidade:** Campos de auditoria (`CreatedBy`, `UpdatedBy`, etc.) obrigatórios em nível de banco via _triggers_ automáticas para garantir a conformidade, mesmo se inseridos fora da API.
- **Soft Delete:** Campos `deleted_at` nulos por padrão. Consultas de API filtram isso automaticamente. Uma rotina de _hard delete_ (LGPD/GDPR) pode ser criada para limpar dados permanentemente a pedido do usuário, de forma agendada.

## 17. Estrutura Feature First (Organização do Projeto)

No front-end/back-end, o código não será organizado por camadas globais (`/models`, `/controllers`, `/views`), mas por domínio:

```
/features
  /transactions
    /api           (endpoints/chamadas)
    /components    (formulários, listas)
    /domain        (Value Objects, tipos lógicos)
    /hooks         (regras de negócio de UI)
  /credit-cards
    ...
```

_Benefício:_ Se no V2 ou V3 decidirmos extrair os Cartões de Crédito para um microserviço ou repositório separado, toda a lógica está contida no mesmo diretório.

## 18. APIs Necessárias

Como estamos usando Supabase e arquitetura pragmática, minimizaremos a criação de endpoints Node.js custosos.

- **Data API (Supabase REST/GraphQL):** Operações CRUD padrão acessadas diretamente via cliente de forma segura (graças ao RLS).
- **Vercel Route Handlers (Next.js API Routes, runtime Node.js):** Decisão fechada — toda lógica transacional complexa roda exclusivamente no runtime Next.js/Vercel (e não em Supabase Edge Functions), mantendo um único runtime, um único deploy e um único local de observabilidade/logs (ver Seção 25). Usadas apenas para operações complexas/transacionais:
  - `/api/transactions/transfer` (Garante integridade ACID na criação das duas pontas).
  - `/api/credit-cards/pay-invoice` (Orquestra o saque da conta e baixa da fatura).
  - `/api/cron/close-invoices` (Vercel Cron diário — fecha faturas no dia de corte de cada cartão).
  - `/api/cron/generate-recurrences` (Vercel Cron diário — gera lançamentos futuros).
  - `/api/dashboard/summary` (Agregação pesada otimizada para não travar o cliente mobile).

## 19. Dashboard e Agregação de Dados

_Desafio:_ Calcular saldos e patrimônio líquito recalculando milhões de linhas é lento.
_Solução Pragmática (MVP):_ Consultas SQL agregadas (`SUM`, `GROUP BY`) baseadas no período atual, cacheadas na Vercel no nível do SWR/React Query.
_Solução para Escala (Preparação):_ Criação de **Materialized Views** no PostgreSQL para `daily_balances` e `category_spending`, atualizadas de forma assíncrona. O dashboard lerá das views, garantindo resposta abaixo de 100ms.

## 20. Roadmap Evolutivo Estratégico

A visão de produto exige um crescimento focado em retenção:

- **MVP (Controle Hábito):** Foco implacável em fazer o usuário registrar dados sem atrito. PWA ultra-rápido, suporte offline parcial (cache de leitura).
- **V2 (Inteligência & Automação):** Introdução de Investimentos (onde o patrimônio realmente cresce). Regras de categorização automáticas (ex: se "Uber", categorizar como "Transporte"). Primeira camada de insights descritivos (IA).
- **V3 (Ecossistema):** Open Finance (elimina o registro manual, a IA apenas categoriza). Lógica social (casais/famílias compartilhando categorias ou orçamentos), gamificação de metas e Chatbot Financeiro (Generative UI).

## 21. Backlog Priorizado (MoSCoW - Escopo do MVP)

**Must Have (Crítico para lançar):**

- Autenticação multiusuário (Supabase).
- CRUD de Contas e Lançamentos (Despesas/Receitas/Transferências).
- Arquitetura Base (Feature First, UTC, Decimal, RLS, Soft Delete).
- Cartões de Crédito Básicos (Fechamento e faturas manuais).
- Dashboard Principal (Saldo, Gastos do Mês).
- PWA / Mobile First Layout.

**Should Have (Importante, mas o sistema roda sem):**

- Recorrências (Engine de cron para gerar lançamentos futuros).
- Orçamentos (Budgets) e indicadores visuais.
- Customização do 1º dia do Mês Financeiro.

**Could Have (Desejável se houver tempo no MVP):**

- Empréstimos e Dívidas (Pode ser simulado como conta negativa inicialmente se atrasar).
- Metas Financeiras (Pode ser lançado poucas semanas após o Core).
- Busca global unificada.

**Won't Have (Definido para V2/V3):**

- Conversão Cambial (Moedas isoladas por enquanto).
- Integração Bancária / Open Finance.
- Suporte Offline Completo (Sync de escrita).

## 22. Preparação para SaaS (Multitenancy e Limites)

Mesmo que o lançamento seja para uso próprio, a fundação está pronta para SaaS:

1.  **Limites e Quotas (Pricing):** Embora não ativados, no modelo de dados deixaremos ganchos (ex: `plan_id` na entidade User) para no futuro limitar a 2 contas no plano _Free_ e ilimitadas no _Pro_.
2.  **Onboarding:** Injeção automática de um "Template Padrão" de Categorias (Alimentação, Moradia, etc.) atrelado ao `UserId` recém-criado através de um _Database Trigger_ ou _Webhook_ no momento do Sign-Up.

## 23. Preparação para IA (Data Structuring)

Um LLM ou IA Preditiva precisa de contexto claro e limpo.

- **Limpeza:** UUIDs, campos de status explícitos (não inferidos), VOs (Money).
- **Contexto:** O campo "Observações" e "Descrição" serão insumos ricos para NLP (Natural Language Processing).
- **Event-Driven:** A arquitetura baseada em eventos de domínio permite plugar no futuro um serviço Python (Agente IA) que escuta a fila de eventos, analisa o comportamento do usuário e injeta um `Notification` sugerindo reduzir gastos em "Delivery".
- **Categorias padronizadas invisíveis:** Internamente, mesmo que o usuário renomeie a categoria para "Ifoodzinho", manteremos um `system_category_id` atrelado a "Alimentação" para que modelos globais de IA possam aprender padrões de gastos gerais de forma anonimizada.

## 24. Possíveis Riscos e Desafios Arquiteturais

- **Risco 1: Concorrência de Saldo (Race Condition).** Se duas transações rápidas (ex: requisições duplicadas por má conexão mobile) forem salvas no exato milissegundo.
  - _Mitigação:_ Usar controle de concorrência otimista (Versionamento de linha) na Conta, ou basear a exibição de saldo estritamente na soma _on-the-fly_ das transações (Single Source of Truth), em vez de armazenar o saldo como uma coluna crua suscetível a dessincronização.
- **Risco 2: Complexidade dos Cartões de Crédito.** Fuso horário (UTC vs Local) impacta diretamente quando ocorre o fechamento da fatura.
  - _Mitigação:_ O "dia de vencimento e fechamento" será tratado com base no _timezone_ da preferência do usuário (salva nas configurações) e cruzado com o motor de faturamento.
- **Risco 3: Fragmentação PWA.** No iOS, Safari impõe restrições severas a PWAs (armazenamento local, notificações).
  - _Mitigação:_ Focar o MVP na experiência de uso web limpa. Planejar empacotamento com Capacitor (Ionic) no V2 caso as limitações da Apple comprometam o engajamento.

---

# Refinamento — Fechamento de Lacunas para o MVP

As seções abaixo foram adicionadas em uma rodada de refinamento arquitetural sobre o planejamento original (Seções 1-24), com o objetivo de resolver contradições, decisões pendentes e ambiguidades técnicas que impactariam diretamente a construção do MVP. Decisões de produto (Patrimônio multi-moeda) e de stack foram validadas com o Product Owner antes de serem fechadas aqui.

## 25. Stack Tecnológico Definitivo (Decisão Fechada)

- **Frontend:** Next.js 14+ (App Router), TypeScript estrito, Tailwind CSS, shadcn/ui (componentes acessíveis, sem vendor lock-in pesado).
- **Dados/Estado:** TanStack Query para todo cache de leitura via Supabase Client (loading/erro/refetch). Estado de UI efêmero com `useState`/`useReducer` — evitar Redux/Zustand a menos que surja uma necessidade concreta.
- **Validação:** Zod como única fonte de verdade de schema, compartilhado entre formulários (React Hook Form + `zodResolver`) e validação de payload nas Route Handlers.
- **Acesso a Dados:** Supabase JS Client direto (client e server) — **sem** ORM adicional (Prisma/Drizzle). O RLS já resolve autorização; uma camada extra só agregaria complexidade sem benefício no MVP.
- **Backend Transacional:** Next.js Route Handlers (runtime Node.js) na Vercel — ver Seção 18 (atualizada). Nenhuma lógica de negócio em Supabase Edge Functions, para manter um único runtime e um único local de observabilidade.
- **Migrations:** Supabase CLI (`supabase migration new`), SQL versionado no repositório, aplicado via pipeline de CI/CD (Seção 27) — nunca manualmente em produção.
- **Gerenciador de pacotes:** pnpm.
- **Testes:** Vitest (unitário/domínio) + Playwright (E2E) — ver Seção 26.
- **Lint/Formatação:** ESLint + Prettier + Husky (pre-commit) + lint-staged.
- **PWA:** Service Worker via plugin PWA para Next.js, estratégia _stale-while-revalidate_ para chamadas de leitura e _cache-first_ para assets estáticos. Manifest com ícones e `display: standalone`.

## 26. Estratégia de Testes e Qualidade

_Por quê?_ O planejamento original não definia como garantir a corretude da lógica financeira — a parte mais sensível a bugs do sistema (dinheiro errado é um bug grave, não cosmético).

- **Testes Unitários (Vitest):** Obrigatórios para Value Objects (`Money`, `DateRange`) e funções puras de domínio (resolução de fatura, cálculo de parcela, cálculo de orçamento, resolução do mês financeiro). São funções puras — sem mocks de banco.
- **Testes de Integração:** Obrigatórios para as Route Handlers transacionais (transferência, pagamento de fatura, fechamento de fatura, geração de recorrência), rodando contra Supabase local (CLI + Docker), validando rollback em falha parcial.
- **Testes E2E (Playwright):** 3 fluxos "golden path" obrigatórios antes de cada release: (1) Cadastro → Login → Criar Conta → Registrar Despesa → saldo atualizado; (2) Compra no cartão → Fechamento de fatura → Pagamento → limite restabelecido; (3) Criar Orçamento → Lançar despesas → Alerta de 80%/100%.
- **Critério pragmático:** Não perseguir 100% de cobertura. Priorizar lógica financeira crítica sobre UI decorativa.

## 27. CI/CD, Ambientes e Observabilidade

_Por quê?_ Sem isso, qualquer alteração de schema ou regra de negócio é arriscada de aplicar em produção sem rede de segurança.

- **Ambientes:** Local (Supabase via Docker + Next.js dev server, com dados _seed_); Preview (Vercel Preview Deployment por Pull Request); Produção (branch `main`, deploy automático via integração Vercel + GitHub).
- **Pipeline (GitHub Actions):** Em cada PR — lint → typecheck → testes unitários/integração → build. Migrations do Supabase aplicadas via CLI em step dedicado, nunca manualmente.
- **Observabilidade:** Sentry (ou similar) para erros client-side e nas Route Handlers; logs estruturados (JSON) nas Route Handlers transacionais, correlacionados com os Eventos de Domínio (Seção 11); Supabase Dashboard para monitorar queries lentas e uso de conexões.

## 28. Modelo de Identidade e Categorias Padrão (Refinamento)

- **User vs `auth.users`:** O Supabase Auth gerencia `auth.users` (não deve ser estendida diretamente). Criamos `public.user_settings` com `id` = FK 1:1 para `auth.users.id`, guardando preferências (tema, idioma, timezone, `financial_month_start_day`, `plan_id` — gancho SaaS da Seção 22).
- **Categorias Padrão (`system_category_id`):** Existe uma tabela `system_categories` (catálogo global, somente leitura para o app, seed via migration). No onboarding (trigger/webhook de sign-up, Seção 22), o sistema copia esse catálogo para `categories` do novo usuário, preenchendo `system_category_id` em cada linha. O usuário pode renomear/desativar livremente sua cópia; o vínculo nunca é exposto na UI nem removido, preservando a base para IA anonimizada (Seção 23).

## 29. Regras de Negócio Complementares (Resolução de Contradições)

- **Exclusão de Categoria com Transações Vinculadas:** Soft delete apenas. A categoria some dos seletores de novos lançamentos, mas transações históricas continuam exibindo a categoria (somente leitura) em relatórios e extratos — o histórico nunca quebra.
- **Abrangência do "Mês Financeiro":** O período customizável (Seção 10) não se aplica apenas a Orçamentos — todo filtro de período (Dashboard, Faturas, Relatórios) deve resolver o intervalo a partir de uma única função de domínio (`resolveFinancialMonth(date, settings)`), evitando que cada módulo implemente sua própria regra de corte divergente.
- **Saldo em Tempo Real vs. Materialized Views (esclarecimento do Risco 1, Seção 24):** O saldo individual de uma `Account` é **sempre** a soma _on-the-fly_ das transações pagas (fonte única da verdade, sem cache). As Materialized Views (Seção 19) servem **exclusivamente** para agregações pesadas do Dashboard (série histórica, gastos por categoria no ano) — nunca para o saldo individual de conta, eliminando o risco de dessincronização.
- **Patrimônio Líquido Multi-Moeda (decisão fechada com o PO):** O MVP exibe o Patrimônio Líquido **segregado por moeda** — um card por moeda (BRL, USD, BTC), sem taxa de câmbio nem consolidação em um único número. Conversão cambial permanece "Won't Have" (Seção 21).

## 30. Critérios de Aceite (Definition of Done) do MVP

O MVP é considerado pronto para uso real quando, simultaneamente:

1.  Um usuário consegue se cadastrar, logar e já ter categorias padrão criadas automaticamente.
2.  Um usuário consegue criar contas em BRL/USD/BTC e ver o saldo de cada uma refletir corretamente despesas, receitas e transferências.
3.  Transferências entre contas são atômicas (falha parcial nunca deixa saldo inconsistente — validado por teste de integração).
4.  Um cartão de crédito calcula corretamente em qual fatura uma compra cai (antes/depois do fechamento) e parcelamentos dividem corretamente entre faturas subsequentes.
5.  O pagamento de fatura gera a despesa na conta de origem, atualiza o status da fatura e restabelece o limite em uma única ação do usuário.
6.  O Dashboard exibe saldo por moeda e gastos do mês corrente respeitando o mês financeiro configurado, em menos de 1s de carregamento percebido.
7.  O sistema funciona como PWA instalável em mobile (Android testado; limitações de iOS documentadas — Risco 3).
8.  Nenhuma query retorna dado de outro usuário sob nenhuma circunstância (validado manualmente com 2 contas de teste).
9.  Todos os registros financeiros respeitam Soft Delete (nenhum DELETE físico em tabelas de domínio).

## 31. Lacunas Reconhecidas e Explicitamente Adiadas para V2/V3

Documentadas para não serem esquecidas nem reabertas como debate durante a execução do MVP:

- **Anexos/Comprovantes** em transações (upload de imagem/PDF) — não há Storage configurado no MVP.
- **Exportação de dados (LGPD/portabilidade)** — rotina de export em JSON/CSV antes do hard delete (Seção 16); adiada para V2, mas o _hook_ de hard delete agendado já deve prever esse passo futuro.
- **Taxas de câmbio / conversão monetária** — desnecessária dada a decisão da Seção 29.
- **Rate limiting de API** — aceitável para uso pessoal (Seção 22); revisitar ao abrir para múltiplos usuários reais (SaaS).
- **Sincronização offline de escrita na PWA** — mantida como "Won't Have" (Seção 21); MVP cobre apenas cache de leitura.
