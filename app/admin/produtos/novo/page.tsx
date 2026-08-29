import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function createProduct(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const regularPrice = String(formData.get("regular_price") || "").replace(",", ".").trim();
  const promoPrice = String(formData.get("promo_price") || "").replace(",", ".").trim();
  const affiliateUrl = String(formData.get("affiliate_url") || "").trim();
  const marketplaceUrl = String(formData.get("marketplace_url") || "").trim();
  const marketplaceItemId = String(formData.get("marketplace_item_id") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const active = formData.get("active") === "on";
  const featured = formData.get("featured") === "on";

  if (!name || !affiliateUrl) {
    throw new Error("Nome e link de afiliado são obrigatórios.");
  }

  const slug = (slugInput || name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const sql = getDb();
  await sql`
    INSERT INTO products (
      name, slug, description, regular_price, promo_price,
      affiliate_url, marketplace_url, marketplace_item_id,
      active, featured, updated_at
    ) VALUES (
      ${name}, ${slug}, ${description || null},
      ${regularPrice ? Number(regularPrice) : null},
      ${promoPrice ? Number(promoPrice) : null},
      ${affiliateUrl}, ${marketplaceUrl || null}, ${marketplaceItemId || null},
      ${active}, ${featured}, NOW()
    )
  `;

  redirect("/admin/produtos");
}

export default function NovoProdutoPage() {
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
        <header className="admin-header">
          <div>
            <p className="eyebrow">CATÁLOGO</p>
            <h1>Novo produto</h1>
            <p className="admin-subtitle">Cadastre um produto para o catálogo do Radar de Achados.</p>
          </div>
          <a className="secondary-button" href="/admin/produtos">← Voltar</a>
        </header>

        <form action={createProduct} className="product-form">
          <section className="form-card">
            <h2>Informações principais</h2>
            <div className="form-grid">
              <label className="field field-full">
                <span>Nome do produto *</span>
                <input name="name" required placeholder="Ex.: Aspirador WAP GTW 10" />
              </label>
              <label className="field field-full">
                <span>Slug</span>
                <input name="slug" placeholder="Deixe vazio para gerar automaticamente" />
              </label>
              <label className="field field-full">
                <span>Descrição</span>
                <textarea name="description" rows={5} placeholder="Descrição resumida do produto" />
              </label>
            </div>
          </section>

          <section className="form-card">
            <h2>Preço e oferta</h2>
            <div className="form-grid two-columns">
              <label className="field"><span>Preço normal</span><input name="regular_price" inputMode="decimal" placeholder="0,00" /></label>
              <label className="field"><span>Preço promocional</span><input name="promo_price" inputMode="decimal" placeholder="0,00" /></label>
            </div>
          </section>

          <section className="form-card">
            <h2>Mercado Livre e afiliado</h2>
            <div className="form-grid">
              <label className="field field-full"><span>Link de afiliado *</span><input type="url" name="affiliate_url" required placeholder="https://..." /></label>
              <label className="field field-full"><span>Link original do produto</span><input type="url" name="marketplace_url" placeholder="https://produto.mercadolivre.com.br/..." /></label>
              <label className="field field-full"><span>Código do anúncio (MLB)</span><input name="marketplace_item_id" placeholder="Ex.: MLB1234567890" /></label>
            </div>
          </section>

          <section className="form-card">
            <h2>Publicação</h2>
            <div className="check-fields">
              <label><input type="checkbox" name="active" defaultChecked /> Produto ativo</label>
              <label><input type="checkbox" name="featured" /> Produto em destaque</label>
            </div>
          </section>

          <div className="form-actions">
            <a className="secondary-button" href="/admin/produtos">Cancelar</a>
            <button className="primary-button" type="submit">Salvar produto</button>
          </div>
        </form>
      </section>
    </main>
  );
}
