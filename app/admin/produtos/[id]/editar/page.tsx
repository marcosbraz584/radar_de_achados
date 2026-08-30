import { getDb } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function parseBrazilianPrice(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, "").replace(/^R\$/i, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function inputPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toFixed(2).replace(".", ",");
}

async function getProduct(id: number) {
  const sql = getDb();
  const rows = await sql`SELECT id, name, slug, description, regular_price, promo_price, affiliate_url, marketplace_url, marketplace_item_id, active, featured FROM products WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

async function updateProduct(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Produto inválido.");
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const regularPrice = parseBrazilianPrice(formData.get("regular_price"));
  const promoPrice = parseBrazilianPrice(formData.get("promo_price"));
  const affiliateUrl = String(formData.get("affiliate_url") || "").trim();
  const marketplaceUrl = String(formData.get("marketplace_url") || "").trim();
  const marketplaceItemId = String(formData.get("marketplace_item_id") || "").trim();
  const active = formData.get("active") === "on";
  const featured = formData.get("featured") === "on";
  if (!name || !affiliateUrl) throw new Error("Nome e link de afiliado são obrigatórios.");
  const slug = (slugInput || name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const sql = getDb();
  await sql`UPDATE products SET name=${name}, slug=${slug}, description=${description || null}, regular_price=${regularPrice}, promo_price=${promoPrice}, affiliate_url=${affiliateUrl}, marketplace_url=${marketplaceUrl || null}, marketplace_item_id=${marketplaceItemId || null}, price_source='manual', updated_at=NOW(), active=${active}, featured=${featured} WHERE id=${id}`;
  redirect("/admin/produtos");
}

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const product: any = await getProduct(id);
  if (!product) notFound();
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-logo">RA</span><div><strong>Radar de Achados</strong><small>Painel 2.0</small></div></div><nav className="admin-nav" aria-label="Menu administrativo"><a href="/admin">Visão geral</a><a className="active" href="/admin/produtos">Produtos</a><span>Categorias</span><span>Cupons</span><span>Banners</span><span>Cliques</span><span>Configurações</span></nav></aside><section className="admin-content"><header className="admin-header"><div><p className="eyebrow">CATÁLOGO</p><h1>Editar produto</h1><p className="admin-subtitle">Atualize os dados do produto sem precisar acessar o banco.</p></div><a className="secondary-button" href="/admin/produtos">← Voltar</a></header><form action={updateProduct} className="product-form"><input type="hidden" name="id" value={product.id}/><section className="form-card"><h2>Informações principais</h2><div className="form-grid"><label className="field field-full"><span>Nome do produto *</span><input name="name" required defaultValue={product.name}/></label><label className="field field-full"><span>Slug</span><input name="slug" defaultValue={product.slug || ""}/></label><label className="field field-full"><span>Descrição</span><textarea name="description" rows={5} defaultValue={product.description || ""}/></label></div></section><section className="form-card"><h2>Preço e oferta</h2><div className="form-grid two-columns"><label className="field"><span>Preço normal</span><input name="regular_price" inputMode="decimal" defaultValue={inputPrice(product.regular_price)}/></label><label className="field"><span>Preço promocional</span><input name="promo_price" inputMode="decimal" defaultValue={inputPrice(product.promo_price)}/></label></div></section><section className="form-card"><h2>Mercado Livre e afiliado</h2><div className="form-grid"><label className="field field-full"><span>Link de afiliado *</span><input type="url" name="affiliate_url" required defaultValue={product.affiliate_url || ""}/></label><label className="field field-full"><span>Link original do produto</span><input type="url" name="marketplace_url" defaultValue={product.marketplace_url || ""}/></label><label className="field field-full"><span>Código MLB do anúncio</span><input name="marketplace_item_id" defaultValue={product.marketplace_item_id || ""}/></label></div></section><section className="form-card"><h2>Publicação</h2><div className="check-fields"><label><input type="checkbox" name="active" defaultChecked={Boolean(product.active)}/> Produto ativo</label><label><input type="checkbox" name="featured" defaultChecked={Boolean(product.featured)}/> Produto em destaque</label></div></section><div className="form-actions"><a className="secondary-button" href="/admin/produtos">Cancelar</a><button className="primary-button" type="submit">Salvar alterações</button></div></form></section></main>;
}
