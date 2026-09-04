import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | string | null;
  promo_price: number | string | null;
  destination_url: string | null;
  platform: string | null;
  image_url: string | null;
  category_name: string | null;
};

function money(value: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await sql<ProductRow[]>`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.promo_price,
      p.destination_url,
      p.platform,
      COALESCE(
        (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1),
        p.image_url
      ) AS image_url,
      c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ${slug} AND p.is_active = true
    LIMIT 1
  `;

  const product = rows[0];
  if (!product) notFound();

  const currentPrice = money(product.promo_price ?? product.price);
  const oldPrice = product.promo_price ? money(product.price) : null;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f5f5", paddingBottom: 56 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px" }}>
        <Link href="/" style={{ color: "#1f4e79", textDecoration: "none", fontWeight: 700 }}>← Voltar para a loja</Link>

        <section style={{ marginTop: 20, background: "white", borderRadius: 16, padding: 28, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1fr)", gap: 36 }}>
          <div style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} style={{ maxWidth: "100%", maxHeight: 440, objectFit: "contain" }} />
            ) : <div>Imagem indisponível</div>}
          </div>

          <div>
            {product.category_name && <div style={{ color: "#666", marginBottom: 10 }}>{product.category_name}</div>}
            <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 18px" }}>{product.name}</h1>
            {oldPrice && <div style={{ color: "#777", textDecoration: "line-through", fontSize: 17 }}>{oldPrice}</div>}
            {currentPrice && <div style={{ fontSize: 38, fontWeight: 800, marginBottom: 8 }}>{currentPrice}</div>}
            {product.platform && <div style={{ color: "#008f39", fontWeight: 700, marginBottom: 24 }}>Oferta em {product.platform}</div>}

            {product.destination_url ? (
              <a href={product.destination_url} target="_blank" rel="nofollow sponsored noopener noreferrer" style={{ display: "block", textAlign: "center", background: "#3483fa", color: "white", padding: "16px 22px", borderRadius: 10, fontWeight: 800, textDecoration: "none", fontSize: 18 }}>
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
