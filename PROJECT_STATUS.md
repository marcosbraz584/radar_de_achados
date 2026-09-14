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
- Banco persistente: Neon PostgreSQL
- Conexão de banco: `lib/db.ts` usando `DATABASE_URL`
- Marketplace/API atualmente integrada: Mercado Livre
- Automação de preços: endpoint protegido por `CRON_SECRET`, acionado por Cron da Hostinger

A arquitetura escolhida permanece: **Hostinger + GitHub + Neon PostgreSQL**.
Não migrar para Vercel, WordPress/Dokan, Bubble ou ChatGPT Sites sem uma decisão explícita e fundamentada.

## 3. Estado confirmado da aplicação atual

### Painel administrativo existente

O repositório contém módulos para:

- Dashboard administrativo
- Produtos
- Categorias e subcategorias
- Cupons
- Banners
- Cliques
- Configurações da loja

### Produtos / Mercado Livre

Já existem recursos para:

- importar/pesquisar produtos do Mercado Livre;
- obter título, imagens, descrição e categoria;
- trabalhar com preço normal e promocional;
- verificar/sincronizar preços;
- registrar histórico de preço;
- acompanhar disponibilidade/estoque informado pela API;
- registrar plataforma e link de afiliado;
- priorizar resultados utilizáveis com preço na busca;
- suportar produto próprio (`sale_mode='OWN'`) e produtos de marketplace.

A última sequência de testes da busca do Mercado Livre teve experimentos de relevância e terminou restaurando a busca considerada estável.
Não refatorar essa busca apenas por estética: primeiro reproduzir o problema e preservar a versão funcional.

### Automação

Existe `app/api/cron/sync-prices/route.ts`.
O endpoint:

- exige `Authorization: Bearer <CRON_SECRET>`;
- seleciona produtos ativos do Mercado Livre com sincronização habilitada;
- atualiza preço e disponibilidade;
- preserva o preço anterior quando há erro/restrição;
- grava histórico quando detecta alteração.

No histórico do projeto, a Hostinger já possuía uma tarefa Cron configurada para executar a sincronização a cada 4 horas (`0 */4 * * *`). Antes de criar outra tarefa, conferir o painel da Hostinger para evitar duplicação.

## 4. Vitrine pública existente

A página inicial atual consulta diretamente o Neon e já possui:

- nome/configuração da loja;
- busca pública;
- menu de categorias;
- categorias e subcategorias;
- carrossel de categorias;
- banners;
- grade de produtos;
- cards responsivos;
- preços;
- marketplace/plataforma;
- páginas próprias de categoria;
- página individual de produto;
- galeria de imagens do produto;
- redirecionamento de oferta com registro de clique.

O menu `Categorias` está implementado em `app/components/StoreCategoriesMenu.tsx` como componente cliente, com abertura/fechamento controlados, clique fora, Escape e adaptação para desktop/mobile.

## 5. Direção visual já decidida

A SHILMASTORE deve ter identidade própria, sem copiar Mercado Livre, OLX ou outros sites.
Direção aprovada:

- Mobile First;
- azul/amarelo próprios da marca;
- aparência clara e moderna;
- mais profundidade visual (cards elevados, sombras suaves, superfícies e hierarquia);
- dois produtos por linha no celular quando adequado;
- busca muito visível;
- categorias confortáveis para toque;
- galeria de produto adequada ao celular;
- futura navegação inferior mobile.

O redesign visual completo deve acontecer como uma etapa coordenada, não por pequenos remendos isolados que possam quebrar a funcionalidade.

## 6. O que NÃO está migrado para esta base ainda

A versão multivendedor que foi validada separadamente no ChatGPT Sites tinha o fluxo:

`vendedor -> aprovação -> produto -> aprovação -> vitrine -> carrinho -> checkout demonstrativo`

Esse fluxo serviu como validação funcional, mas **não está atualmente implementado nesta branch da Hostinger**.
Na estrutura atual do repositório não foram identificados módulos próprios de:

- vendedores;
- aprovação de vendedor;
- lojas de vendedores;
- carrinho persistente;
- pedidos de marketplace;
- comissão da SHILMASTORE por vendedor/pedido;
- aprovação de produto por vendedor.

Portanto, não afirmar que a SHILMASTORE multivendedor está concluída. Essa é a próxima grande expansão arquitetural a ser migrada para a base Hostinger + Neon.

## 7. Fluxo multivendedor que deve ser preservado

Quando a expansão for implementada, preservar exatamente o fluxo validado:

`vendedor -> aprovação do administrador -> cadastro de produto -> aprovação do produto -> vitrine -> carrinho -> pedido -> comissão da SHILMASTORE`

O formulário de produto físico já validado no protótipo inclui:

- preço;
- estoque;
- SKU;
- imagens;
- peso;
- comprimento;
- largura;
- altura;
- CEP de origem.

Não voltar a testar manualmente o mesmo formulário/carrinho apenas para confirmar conceitos já validados; implementar persistência real na base atual.

## 8. Próxima etapa recomendada

Antes de criar telas novas, fazer o desenho/migração da camada de dados multivendedor no Neon, aproveitando as tabelas e recursos atuais sem quebrar a vitrine existente.

Ordem recomendada:

1. inventariar o schema atual do Neon;
2. definir tabelas/relacionamentos adicionais para usuários, vendedores, lojas, aprovações, carrinhos, pedidos, itens de pedido e comissões;
3. preparar migrations idempotentes/seguras;
4. implementar autenticação e papéis de usuário;
5. implementar cadastro e aprovação de vendedor;
6. ligar produtos ao vendedor/loja e adicionar aprovação de produto;
7. implementar carrinho e pedidos persistentes;
8. implementar comissão;
9. testar o fluxo ponta a ponta;
10. somente depois fazer o redesign Mobile First completo.

## 9. Regras de trabalho

- O usuário é iniciante; quando a participação dele for necessária, passar **um único passo por vez**, dizer exatamente onde clicar/o que preencher e esperar confirmação antes de avançar.
- Sempre que possível, executar alterações técnicas diretamente pelo GitHub em vez de pedir cópia e cola de código.
- Nunca alterar a branch `main` ou o site antigo sem necessidade explícita.
- Não quebrar funcionalidades estáveis para recomeçar do zero.
- Antes de qualquer serviço, plugin ou alteração que possa gerar custo, avisar claramente e pedir decisão do usuário.
- Não prometer trabalho em segundo plano. Executar as ações na própria resposta quando possível.

## 10. Ponto de retomada para uma nova conversa

Mensagem sugerida:

> Continue a SHILMASTORE. Consulte primeiro `PROJECT_STATUS.md` e a branch `radar-2.0` do repositório `marcosbraz584/radar_de_achados`. Não refaça testes já validados. Siga a seção "Próxima etapa recomendada".
