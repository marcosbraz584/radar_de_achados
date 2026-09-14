# SHILMASTORE — PROJECT STATUS

Última revisão: 2026-09-14
Branch oficial de desenvolvimento: `radar-2.0`
Repositório: `marcosbraz584/radar_de_achados`

## 1. Regra de continuidade

Este arquivo é a fonte de verdade para retomar o projeto em uma nova conversa.
Antes de qualquer alteração, ler este arquivo e conferir o estado atual da branch `radar-2.0` no GitHub.
Não reconstruir funcionalidades já validadas sem um novo motivo técnico.

## 2. Arquitetura oficial

- Hospedagem/aplicação: Hostinger
- Framework: Next.js + TypeScript
- Repositório/deploy: GitHub, branch `radar-2.0`
- Banco persistente: Neon PostgreSQL, branch `main`, banco `neondb`
- Conexão de banco: `lib/db.ts` usando `DATABASE_URL`
- Marketplace/API atualmente integrada: Mercado Livre
- Automação de preços: endpoint protegido por `CRON_SECRET`, acionado por Cron da Hostinger

Arquitetura fixada: **Hostinger + GitHub + Neon PostgreSQL**.
Não migrar para Vercel, WordPress/Dokan, Bubble ou ChatGPT Sites sem decisão explícita e fundamentada.

## 3. Aplicação atual preservada

O painel administrativo existente contém Dashboard, Produtos, Categorias/Subcategorias, Cupons, Banners, Cliques e Configurações da loja.

A base existente continua suportando catálogo próprio e Mercado Livre, incluindo importação/pesquisa, título, imagens, descrição, categorias, preços, histórico de preço, disponibilidade, link afiliado e sincronização automática.

A vitrine pública atual continua sendo preservada. Não reconstruir ou refatorar funcionalidades estáveis sem reproduzir primeiro um problema real.

## 4. Schema Neon confirmado antes da expansão

Tabelas preexistentes e preservadas:

- `banners`
- `categories`
- `clicks`
- `coupons`
- `marketplace_tokens`
- `price_history`
- `product_images`
- `products`
- `store_settings`

Relacionamentos confirmados incluem categorias hierárquicas por `parent_id`, `products -> categories`, e tabelas auxiliares relacionadas a `products`.

## 5. Expansão multivendedor — ETAPA 1 CONCLUÍDA

Criadas e confirmadas no Neon:

- `app_users`
- `sellers`
- `seller_stores`
- `seller_status_history`

Fluxo de dados preparado:

`usuário -> solicitação de vendedor -> pending -> aprovação/rejeição -> loja do vendedor`

Status de vendedor previstos: `pending`, `approved`, `rejected`, `suspended`.

## 6. Expansão multivendedor — ETAPA 2 CONCLUÍDA

A tabela `products` foi expandida de forma retrocompatível com:

- `seller_id`
- `approval_status` (default `approved`, preservando produtos antigos)
- `approval_notes`
- `approved_by`
- `approved_at`
- `sku`
- `stock_quantity`
- `stock_tracking`

Também foi criada:

- `product_status_history`

Produtos de vendedores externos deverão ser gravados explicitamente como `approval_status='pending'`; produtos administrativos/antigos permanecem compatíveis e aprovados.

## 7. Expansão multivendedor — ETAPA 3 CONCLUÍDA

Criadas e confirmadas no Neon:

- `platform_commission_rules`
- `carts`
- `cart_items`
- `orders`
- `seller_orders`
- `order_items`
- `order_status_history`

A estrutura suporta:

- carrinho persistente de usuário ou visitante;
- um carrinho ativo por usuário/sessão;
- um pedido principal do comprador;
- divisão lógica do pedido em subpedidos por vendedor;
- produtos vendidos diretamente pela SHILMASTORE (`seller_id` nulo);
- snapshot de nome, SKU, preço e valores financeiros nos itens do pedido;
- comissão percentual e taxa fixa;
- regra geral ou específica por vendedor;
- total da comissão da plataforma e líquido do vendedor;
- histórico de status do pedido.

Nenhuma porcentagem comercial de comissão foi definida ainda. Não inventar uma taxa; essa decisão será feita posteriormente.

## 8. Estado atual do fluxo

A camada de banco agora está preparada para:

`usuário -> vendedor -> aprovação do vendedor -> loja -> produto -> aprovação do produto -> estoque -> carrinho -> pedido -> divisão por vendedor -> comissão`

IMPORTANTE: a camada de dados está preparada, mas as novas telas e APIs da aplicação Hostinger ainda não estão ligadas a essas tabelas. Não afirmar que o marketplace multivendedor está funcional ponta a ponta ainda.

## 9. Próxima etapa oficial

Parar de criar tabelas indiscriminadamente e começar a ligar a aplicação Next.js ao novo schema.

Ordem atual:

1. implementar autenticação persistente e papéis (`customer`, `seller`, `admin`);
2. implementar cadastro/solicitação de vendedor;
3. implementar aprovação de vendedor pelo administrador;
4. implementar dados da loja do vendedor;
5. ligar cadastro de produto ao vendedor com `approval_status='pending'`;
6. implementar aprovação de produto;
7. ligar carrinho persistente;
8. criar checkout/pedido persistente e divisão por vendedor;
9. aplicar regra de comissão;
10. testar o fluxo completo;
11. somente depois executar redesign Mobile First coordenado.

Antes de escolher biblioteca/serviço de autenticação, inspecionar o código atual para verificar se já existe alguma autenticação aproveitável. Não adicionar serviço pago sem avisar o usuário.

## 10. Funcionalidades validadas que devem ser preservadas

No protótipo anterior foi validado o fluxo:

`vendedor -> aprovação -> produto -> aprovação -> vitrine -> carrinho -> checkout demonstrativo`

O formulário de produto físico validado inclui preço, estoque, SKU, imagens, peso, comprimento, largura, altura e CEP de origem.

Não repetir testes conceituais já validados sem motivo técnico; migrar esses comportamentos para a base persistente atual.

## 11. Regras de trabalho

- Usuário iniciante: quando sua participação for necessária, passar **um único passo por vez**, dizer exatamente onde clicar/o que preencher e aguardar confirmação.
- Sempre que possível, executar alterações diretamente pelo GitHub em vez de pedir cópia/cola de código.
- Não alterar a branch `main` do GitHub nem o site WordPress antigo sem decisão explícita.
- Preservar funcionalidades estáveis e dados existentes.
- Antes de serviço, plugin ou alteração que possa gerar custo, avisar claramente.
- GitHub + `PROJECT_STATUS.md` são a fonte de continuidade entre conversas.

## 12. Ponto de retomada

Em nova conversa:

> Continue a SHILMASTORE. Consulte primeiro `PROJECT_STATUS.md` e a branch `radar-2.0` de `marcosbraz584/radar_de_achados`. O schema multivendedor do Neon já concluiu as Etapas 1, 2 e 3. Não recrie tabelas; prossiga pela integração da aplicação, começando pela autenticação e papéis.
