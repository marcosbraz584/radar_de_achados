import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getProducts() {
  const sql = getDb();
  return sql`
    SELECT id, title, price, promo_price, affiliate_url, active, featured, updated_at
    FROM products
    ORDER BY updated_at DESC
    LIMIT 100
  `;
}

export default async function ProdutosPage() {
  const products = await getProducts();

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-logo">RA</span>
          <div><strong>Radar de Achados</strong><small>Painel 2.0</small></div>
        </div>
        <nav className="admin-nav" aria-label="Menu administrativo">
          <a href="/admin">Visão geral</a>
          <a className="active" href="/admin/produtos">Produtos</a>
          <span>Categorias</span><span>Cupons</span><span>Banners</span><span>Cliques</span><span>Configurações</span>
        </nav>
      </aside>

      <section className="admin-content">
        <header className="admin-header products-header">
          <div>
            <p className="eyebrow">CATÁLOGO</p>
            <h1>Produtos</h1>
            <p className="admin-subtitle">Cadastre e gerencie os achados publicados na loja.</p>
          </div>
          <button className="primary-button" type="button">+ Novo produto</button>
        </header>

        <section className="admin-panel products-panel">
          <div className="products-toolbar">
            <div><strong>{products.length}</strong> produto{products.length === 1 ? "" : "s"} cadastrado{products.length === 1 ? "" : "s"}</div>
            <span className="db-status"><i /> Banco conectado</span>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌕</div>
              <h2>Nenhum produto cadastrado</h2>
              <p>O banco está pronto. O próximo passo será ativar o cadastro de produtos pelo painel.</p>
            </div>
          ) : (
            <div className="product-list">
              {products.map((product: any) => (
                <article className="product-row" key={product.id}>
                  <div><strong>{product.title}</strong><small>{product.active ? "Ativo" : "Inativo"}{product.featured ? " • Destaque" : ""}</small></div>
                  <strong>R$ {Number(product.promo_price ?? product.price ?? 0).toFixed(2).replace(".", ",")}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
