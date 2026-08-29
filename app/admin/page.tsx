import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type CountRow = { count: number | string };

async function getDashboardData() {
  const products = await sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM products`;
  const categories = await sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM categories`;
  const coupons = await sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM coupons`;
  const clicks = await sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM clicks`;

  return {
    products: Number(products[0]?.count ?? 0),
    categories: Number(categories[0]?.count ?? 0),
    coupons: Number(coupons[0]?.count ?? 0),
    clicks: Number(clicks[0]?.count ?? 0),
  };
}

export default async function AdminPage() {
  const data = await getDashboardData();

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-logo">RA</span>
          <div>
            <strong>Radar de Achados</strong>
            <small>Painel 2.0</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Menu administrativo">
          <a className="active" href="/admin">Visão geral</a>
          <span>Produtos</span>
          <span>Categorias</span>
          <span>Cupons</span>
          <span>Banners</span>
          <span>Cliques</span>
          <span>Configurações</span>
        </nav>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">ADMINISTRAÇÃO</p>
            <h1>Painel Radar de Achados</h1>
            <p className="admin-subtitle">Acompanhe e gerencie sua loja em um só lugar.</p>
          </div>
          <span className="db-status"><i /> Banco conectado</span>
        </header>

        <div className="stats-grid">
          <article className="stat-card"><span>Produtos</span><strong>{data.products}</strong><small>cadastrados</small></article>
          <article className="stat-card"><span>Categorias</span><strong>{data.categories}</strong><small>organizadas</small></article>
          <article className="stat-card"><span>Cupons</span><strong>{data.coupons}</strong><small>registrados</small></article>
          <article className="stat-card"><span>Cliques</span><strong>{data.clicks}</strong><small>registrados</small></article>
        </div>

        <section className="admin-panel">
          <div>
            <p className="eyebrow">RADAR DE ACHADOS 2.0</p>
            <h2>Base administrativa funcionando</h2>
            <p>O painel já está lendo os dados diretamente do PostgreSQL no Neon. Nos próximos passos, cada área do menu ganhará suas funções de cadastro e gerenciamento.</p>
          </div>
          <div className="panel-check">✓</div>
        </section>
      </section>
    </main>
  );
}
