import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getProducts() {
  const sql = getDb();
  return sql`
    SELECT p.id, p.name, p.regular_price, p.promo_price, p.affiliate_url, p.active, p.featured, p.updated_at,
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image_url
    FROM products p
    ORDER BY p.updated_at DESC
    LIMIT 100
  `;
}

function formatPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return "Preço não informado";
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return "Preço não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric);
}

export default async function ProdutosPage() {
  const products = await getProducts();
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-logo">RA</span><div><strong>Radar de Achados</strong><small>Painel 2.0</small></div></div><nav className="admin-nav" aria-label="Menu administrativo"><a href="/admin">Visão geral</a><a className="active" href="/admin/produtos">Produtos</a><span>Categorias</span><span>Cupons</span><span>Banners</span><span>Cliques</span><span>Configurações</span></nav></aside>
      <section className="admin-content"><header className="admin-header products-header"><div><p className="eyebrow">CATÁLOGO</p><h1>Produtos</h1><p className="admin-subtitle">Cadastre e gerencie os achados publicados na loja.</p></div><a className="primary-button" href="/admin/produtos/novo">+ Novo produto</a></header>
        <section className="admin-panel products-panel"><div className="products-toolbar"><div><strong>{products.length}</strong> produto{products.length===1?"":"s"} cadastrado{products.length===1?"":"s"}</div><span className="db-status"><i/> Banco conectado</span></div>
          {products.length===0?<div className="empty-state"><div className="empty-icon">⌕</div><h2>Nenhum produto cadastrado</h2><p>O banco está pronto. O próximo passo será ativar o cadastro de produtos pelo painel.</p></div>:<div className="product-list">{products.map((product:any)=><article className="product-row" key={product.id}><div className="product-row-main">{product.image_url?<img className="product-thumb" src={product.image_url} alt={product.name}/>:<div className="product-thumb product-thumb-empty">RA</div>}<div className="product-row-info"><strong>{product.name}</strong><small>{product.active?"Ativo":"Inativo"}{product.featured?" • Destaque":""}</small></div></div><div style={{display:"flex",alignItems:"center",gap:"16px"}}><strong>{formatPrice(product.promo_price ?? product.regular_price)}</strong><a className="secondary-button" href={`/admin/produtos/${product.id}/editar`}>Editar</a></div></article>)}</div>}
        </section></section>
    </main>
  );
}
