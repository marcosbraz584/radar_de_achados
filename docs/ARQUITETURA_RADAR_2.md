# Radar de Achados 2.0 — Arquitetura Técnica

## Objetivo
Transformar a vitrine atual em uma aplicação web administrável, com banco de dados, dashboard e automações, preservando o site atual durante a migração.

## O que existe hoje
- `index.html`: vitrine completa em HTML/CSS/JavaScript.
- `config.js`: URLs públicas do Google Sheets e configuração de cliques.
- Catálogo e configurações são carregados no navegador via CSV.
- Produtos dependem de dados preenchidos na planilha.

## O que será preservado
- Identidade visual do Radar de Achados.
- Categorias e subcategorias.
- Destaques.
- Carrossel de banners.
- Busca.
- Cards de produtos.
- Modal/detalhe do produto.
- Galeria de imagens.
- Cupons.
- Vídeos.
- Links de afiliado.
- Compartilhamento.
- Layout responsivo.

## Nova arquitetura alvo

Mercado Livre / fontes autorizadas
→ camada de importação e sincronização
→ PostgreSQL
→ API do Radar
→ Site público + Dashboard administrativo

## Stack inicial
- Frontend e backend: Next.js
- Hospedagem: Vercel
- Banco de dados: PostgreSQL
- Banco recomendado para iniciar: Neon integrado à Vercel
- Autenticação do dashboard: será adicionada antes de qualquer área administrativa pública

## Módulos planejados
### Site público
- Home
- Categorias
- Busca
- Produtos
- Destaques
- Banners
- Ofertas
- Compartilhamento
- SEO por produto e categoria

### Dashboard
- Visão geral
- Produtos
- Categorias e subcategorias
- Banners
- Cupons
- Configurações da loja
- Cliques
- Histórico de preço
- Estado de sincronização

### Automação
- Importar dados do produto quando houver fonte/API autorizada.
- Atualizar preços periodicamente quando permitido.
- Atualizar imagens por URL sem exigir download manual.
- Detectar produtos indisponíveis quando a integração permitir.
- Calcular desconto automaticamente.
- Registrar histórico de alterações.

## Migração segura
1. A branch `main` permanece como referência do site atual.
2. Todo desenvolvimento novo ocorre em `radar-2.0`.
3. O projeto Vercel `radar-de-achados-2` acompanha `radar-2.0`.
4. O domínio principal só será alterado depois de testes completos.
5. A planilha poderá ser usada como fonte de importação inicial para evitar recadastro manual.

## Primeiro modelo de dados
- `products`
- `categories`
- `subcategories`
- `product_images`
- `banners`
- `coupons`
- `clicks`
- `price_history`
- `store_settings`
- `sync_logs`

## Regra do projeto
Nunca remover o sistema atual antes de existir uma versão 2.0 funcional e testada no ambiente separado.
