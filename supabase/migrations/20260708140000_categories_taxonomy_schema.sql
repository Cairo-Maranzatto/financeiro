-- Fase A0 do aprimoramento de categorias (fases/aprimoramento/FASE_A00_SCHEMA_TAXONOMIA.md)
-- Adiciona hierarquia real a system_categories (hoje uma tabela flat de 14 linhas) e semeia
-- a taxonomia completa de fases/CATEGORIAS_REFERENCIA.md: 16 categorias-pai + subcategorias + 1 especial novo.
--
-- NOTA: a contagem de subcategorias das tabelas detalhadas da doc de referência (76: 18 Receita +
-- 58 Despesa) diverge do resumo da própria doc ("71 subcategorias"). As tabelas item a item são
-- a fonte de verdade usada aqui — o resumo da doc tem um erro de soma que deve ser corrigido
-- separadamente no markdown.
--
-- As 14 linhas antigas de system_categories NUNCA são apagadas (têm FK de categories.system_category_id
-- de todo usuário existente). "Saldo Inicial" é reaproveitada tal como está. As outras 13 antigas são
-- marcadas is_active = false nesta mesma migration para que, a partir de agora, nenhum onboarding novo
-- as copie (a função handle_new_user() é atualizada só na Fase A1, mas is_active já reflete a intenção
-- final e evita ambiguidade de nomes repetidos entre taxonomia antiga e nova, ex: "Moradia" existe nas duas).

-- -------------------------------------------------------------------------
-- 1. Colunas novas
-- -------------------------------------------------------------------------
alter table public.system_categories
  add column parent_id uuid references public.system_categories(id),
  add column is_active boolean not null default true;

comment on column public.system_categories.parent_id is
  'Categoria-pai no catálogo global (2 níveis, fases/CATEGORIAS_REFERENCIA.md). Null para categorias-pai e para as especiais (Outras/Não Categorizado, Saldo Inicial).';
comment on column public.system_categories.is_active is
  'false = legado (taxonomia flat pré-aprimoramento), mantido só por integridade referencial de FKs existentes em categories.system_category_id. Nunca copiado para novos usuários (handle_new_user() filtra is_active = true a partir da Fase A1).';

-- -------------------------------------------------------------------------
-- 2. Trigger: subcategoria herda o tipo do pai
-- -------------------------------------------------------------------------
create or replace function public.validate_system_category_type()
returns trigger as $$
begin
  if new.parent_id is not null then
    if new.type <> (select type from public.system_categories where id = new.parent_id) then
      raise exception 'Subcategoria "%" deve herdar o tipo (Receita/Despesa) da categoria-pai', new.name;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_system_category_type
  before insert or update on public.system_categories
  for each row execute function public.validate_system_category_type();

-- -------------------------------------------------------------------------
-- 3. Desativa as 13 categorias antigas não-internas (Saldo Inicial continua ativa e é reaproveitada)
-- -------------------------------------------------------------------------
update public.system_categories
set is_active = false
where is_internal = false
  and name in (
    'Salário', 'Investimentos', 'Outras Receitas',
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer',
    'Compras', 'Assinaturas', 'Pagamento de Cartão', 'Outras Despesas'
  );

-- -------------------------------------------------------------------------
-- 4. Seed: 16 categorias-pai (4 Receita + 12 Despesa)
-- -------------------------------------------------------------------------
insert into public.system_categories (name, type, icon, is_internal, sort_order) values
  ('Trabalho & Salário', 'Receita', 'banknote', false, 100),
  ('Rendimentos & Investimentos', 'Receita', 'trending-up', false, 200),
  ('Benefícios & Governo', 'Receita', 'landmark', false, 300),
  ('Outras Receitas', 'Receita', 'plus-circle', false, 400),
  ('Moradia', 'Despesa', 'home', false, 500),
  ('Alimentação', 'Despesa', 'utensils', false, 600),
  ('Transporte', 'Despesa', 'car', false, 700),
  ('Saúde', 'Despesa', 'heart-pulse', false, 800),
  ('Educação', 'Despesa', 'graduation-cap', false, 900),
  ('Lazer & Entretenimento', 'Despesa', 'gamepad-2', false, 1000),
  ('Vestuário & Beleza', 'Despesa', 'shopping-bag', false, 1100),
  ('Família & Dependentes', 'Despesa', 'users', false, 1200),
  ('Serviços & Profissionais', 'Despesa', 'briefcase', false, 1300),
  ('Finanças & Impostos', 'Despesa', 'receipt', false, 1400),
  ('Tecnologia', 'Despesa', 'monitor', false, 1500),
  ('Investimentos (Aporte)', 'Despesa', 'piggy-bank', false, 1600);

-- -------------------------------------------------------------------------
-- 5. Seed: especial novo "Outras / Não Categorizado" (Saldo Inicial já existe e é reaproveitada)
-- -------------------------------------------------------------------------
insert into public.system_categories (name, type, icon, is_internal, sort_order) values
  ('Outras / Não Categorizado', 'Ambas', 'circle-ellipsis', false, 9000);

-- -------------------------------------------------------------------------
-- 6. Seed: 18 subcategorias de Receita
-- -------------------------------------------------------------------------
insert into public.system_categories (name, type, icon, is_internal, sort_order, parent_id)
select v.name, 'Receita', null, false, v.sort_order, p.id
from (values
  ('Salário / Ordenado', 101, 'Trabalho & Salário'),
  ('13º Salário & Férias', 102, 'Trabalho & Salário'),
  ('Bônus / PLR / Comissão', 103, 'Trabalho & Salário'),
  ('Freelance & Consultoria', 104, 'Trabalho & Salário'),
  ('Pró-Labore', 105, 'Trabalho & Salário'),
  ('Dividendos / JCP', 201, 'Rendimentos & Investimentos'),
  ('Rendimento Renda Fixa', 202, 'Rendimentos & Investimentos'),
  ('Aluguel Recebido', 203, 'Rendimentos & Investimentos'),
  ('Ganho de Capital', 204, 'Rendimentos & Investimentos'),
  ('Rendimento em Cripto', 205, 'Rendimentos & Investimentos'),
  ('FGTS / Rescisão', 301, 'Benefícios & Governo'),
  ('Auxílios Governamentais', 302, 'Benefícios & Governo'),
  ('Previdência / Aposentadoria', 303, 'Benefícios & Governo'),
  ('Restituição IR', 304, 'Benefícios & Governo'),
  ('Venda de Bens', 401, 'Outras Receitas'),
  ('Cashback & Reembolsos', 402, 'Outras Receitas'),
  ('Prêmios / Sorteios', 403, 'Outras Receitas'),
  ('Receitas Eventuais', 404, 'Outras Receitas')
) as v(name, sort_order, parent_name)
join public.system_categories p
  on p.name = v.parent_name and p.parent_id is null and p.is_active;

-- -------------------------------------------------------------------------
-- 7. Seed: 58 subcategorias de Despesa
-- -------------------------------------------------------------------------
insert into public.system_categories (name, type, icon, is_internal, sort_order, parent_id)
select v.name, 'Despesa', null, false, v.sort_order, p.id
from (values
  ('Aluguel / Financiamento', 501, 'Moradia'),
  ('Condomínio', 502, 'Moradia'),
  ('IPTU', 503, 'Moradia'),
  ('Energia Elétrica', 504, 'Moradia'),
  ('Água & Esgoto', 505, 'Moradia'),
  ('Gás', 506, 'Moradia'),
  ('Internet & TV', 507, 'Moradia'),
  ('Manutenção & Reparos', 508, 'Moradia'),
  ('Seguro Residencial', 509, 'Moradia'),
  ('Supermercado & Feira', 601, 'Alimentação'),
  ('Restaurante & Delivery', 602, 'Alimentação'),
  ('Padaria & Lanches', 603, 'Alimentação'),
  ('Bebidas', 604, 'Alimentação'),
  ('Combustível', 701, 'Transporte'),
  ('Transporte Público', 702, 'Transporte'),
  ('Aplicativos (Uber/99)', 703, 'Transporte'),
  ('Manutenção Veículo', 704, 'Transporte'),
  ('IPVA & Seguro Auto', 705, 'Transporte'),
  ('Pedágio & Estacionamento', 706, 'Transporte'),
  ('Plano de Saúde / Dental', 801, 'Saúde'),
  ('Consultas & Exames', 802, 'Saúde'),
  ('Medicamentos', 803, 'Saúde'),
  ('Farmácia & Higiene', 804, 'Saúde'),
  ('Academia & Esportes', 805, 'Saúde'),
  ('Saúde Mental', 806, 'Saúde'),
  ('Mensalidade Escola / Faculdade', 901, 'Educação'),
  ('Cursos & Capacitações', 902, 'Educação'),
  ('Livros & Material Didático', 903, 'Educação'),
  ('Idiomas', 904, 'Educação'),
  ('Assinaturas Streaming', 1001, 'Lazer & Entretenimento'),
  ('Cinema / Shows / Teatro', 1002, 'Lazer & Entretenimento'),
  ('Viagens & Hospedagem', 1003, 'Lazer & Entretenimento'),
  ('Hobby & Jogos', 1004, 'Lazer & Entretenimento'),
  ('Festas & Eventos', 1005, 'Lazer & Entretenimento'),
  ('Roupas & Calçados', 1101, 'Vestuário & Beleza'),
  ('Beleza & Estética', 1102, 'Vestuário & Beleza'),
  ('Cosméticos & Perfumes', 1103, 'Vestuário & Beleza'),
  ('Filhos (Educação, Saúde, Lazer)', 1201, 'Família & Dependentes'),
  ('Pet & Animais', 1202, 'Família & Dependentes'),
  ('Presentes & Comemorações', 1203, 'Família & Dependentes'),
  ('Doações & Caridade', 1204, 'Família & Dependentes'),
  ('Empregada / Diarista', 1301, 'Serviços & Profissionais'),
  ('Contador & Advogado', 1302, 'Serviços & Profissionais'),
  ('Celular & Telefonia', 1303, 'Serviços & Profissionais'),
  ('Outros Serviços', 1304, 'Serviços & Profissionais'),
  ('IRPF & Impostos', 1401, 'Finanças & Impostos'),
  ('Tarifas Bancárias & IOF', 1402, 'Finanças & Impostos'),
  ('Juros & Multas', 1403, 'Finanças & Impostos'),
  ('Seguros Gerais', 1404, 'Finanças & Impostos'),
  ('Pagamento de Cartão', 1405, 'Finanças & Impostos'),
  ('Eletrônicos & Equipamentos', 1501, 'Tecnologia'),
  ('Apps & Software', 1502, 'Tecnologia'),
  ('Aparelho Celular', 1503, 'Tecnologia'),
  ('Reserva de Emergência', 1601, 'Investimentos (Aporte)'),
  ('Previdência Privada', 1602, 'Investimentos (Aporte)'),
  ('Renda Variável (Ações, FIIs)', 1603, 'Investimentos (Aporte)'),
  ('Renda Fixa & Tesouro', 1604, 'Investimentos (Aporte)'),
  ('Criptomoedas', 1605, 'Investimentos (Aporte)')
) as v(name, sort_order, parent_name)
join public.system_categories p
  on p.name = v.parent_name and p.parent_id is null and p.is_active;
