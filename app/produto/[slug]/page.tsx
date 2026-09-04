import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  regular_price: number | string | null;
  promo_price: number | string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  platform: string | null;
  category_name: string | null;
};

type ImageRow = { image_url: string };

function money(value: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

function platformLabel(value: string | null) {
  const labels: Record<string, string> = {
    mercado_livre: "Mercado Livre",
    shopee: "Shopee",
    amazon: "Amazon",
    hotmart: "Hotmart",
    proprio: "SHILMASTORE",
    outra: "Outra plataforma",
  };
  return value ? labels[value] || value : "";
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sql = getDb();
  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.regular_price,
      p.promo_price,
      p.destination_url,
      p.affiliate_url,
      p.platform,
      c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ${slug} AND p.active = TRUE
    LIMIT 1
  `;

  const product = rows[0] as ProductRow | undefined;
  if (!product) notFound();

  const imageRows = await sql`
    SELECT image_url
    FROM product_images
    WHERE product_id = ${product.id}
    ORDER BY sort_order ASC, id ASC
    LIMIT 6
  ` as ImageRow[];

  const images = imageRows.map((row) => row.image_url).filter(Boolean);
  const mainImage = images[0] || null;
  const currentPrice = money(product.promo_price ?? product.regular_price);
  const oldPrice = product.promo_price ? money(product.regular_price) : null;
  const destination = product.destination_url || product.affiliate_url;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f5f5", paddingBottom: 56 }}>
      <style>{`@media(max-width:760px){.product-detail-grid{grid-template-columns:1fr!important}.product-detail-image{min-height:280px!important}.product-detail-card{padding:18px!important}.product-detail-title{font-size:24px!important}.product-thumbs{grid-template-columns:repeat(4,1fr)!important}}`}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px" }}>
        <Link href="/#ofertas" style={{ color: "#1f4e79", textDecoration: "none", fontWeight: 700 }}>← Voltar para a loja</Link>

        <section className="product-detail-grid product-detail-card" style={{ marginTop: 20, background: "white", borderRadius: 16, padding: 28, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1fr)", gap: 36 }}>
          <div>
            <div className="product-detail-image" style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {mainImage ? (
                <img src={mainImage} alt={product.name} style={{ maxWidth: "100%", maxHeight: 440, objectFit: "contain" }} />
              ) : <div style={{ color: "#777" }}>Imagem indisponível</div>}
            </div>

            {images.length > 1 && (
              <div className="product-thumbs" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                {images.slice(0, 4).map((image, index) => (
                  <div key={image} style={{ height: 92, border: index === 0 ? "2px solid #3483fa" : "1px solid #ddd", borderRadius: 9, display: "grid", placeItems: "center", padding: 6, background: "#fff" }}>
                    <img src={image} alt={`${product.name} - imagem ${index + 1}`} style={{ maxWidth: "100%", maxHeight: 78, objectFit: "contain" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category_name && <div style={{ color: "#666", marginBottom: 10 }}>{product.category_name}</div>}
            <h1 className="product-detail-title" style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 18px" }}>{product.name}</h1>
            {oldPrice && <div style={{ color: "#777", textDecoration: "line-through", fontSize: 17 }}>{oldPrice}</div>}
            {currentPrice && <div style={{ fontSize: 38, fontWeight: 800, marginBottom: 8 }}>{currentPrice}</div>}
            {product.platform && <div style={{ color: "#008f39", fontWeight: 700, marginBottom: 24 }}>Oferta em {platformLabel(product.platform)}</div>}

            {destination ? (
              <a href={`/go/${product.id}?source=product-page`} target="_blank" rel="nofollow sponsored noopener noreferrer" style={{ display: "block", textAlign: "center", background: "#3483fa", color: "white", padding: "16px 22px", borderRadius: 10, fontWeight: 800, textDecoration: "none", fontSize: 18 }}>
                Ver oferta
              </a>
            ) : (
              <div style={{ padding: 16, background: "#fff4d6", borderRadius: 10 }}>Link da oferta ainda não cadastrado.</div>
            )}
            <p style={{ color: "#666", fontSize: 13, lineHeight: 1.5 }}>Ao clicar, você será direcionado para a plataforma parceira para concluir a compra.</p>
          </div>
        </section>

        {product.description && (
          <section style={{ marginTop: 22, background: "white", borderRadius: 16, padding: 28 }}>
            <h2 style={{ marginTop: 0 }}>Descrição do produto</h2>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.65, color: "#333" }}>{product.description}</div>
          </section>
        )}
      </div>
    </main>
  );
}
