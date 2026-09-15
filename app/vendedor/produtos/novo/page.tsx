import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function parsePrice(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function parseNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function getApprovedSeller(userId: number) {
  const sql = getDb();
  const rows = await sql`
    SELECT s.id AS seller_id, s.approval_status, st.store_name
    FROM sellers s
    LEFT JOIN seller_stores st ON st.seller_id = s.id
    WHERE s.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] as any;
}

async function uploadToCloudinary(file: File, productName: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary não está configurado no servidor.");

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "shilmastore/produtos";
  const signatureSource = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signatureBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(signatureSource));
  const signature = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  if (!response.ok) {
    let cloudinaryMessage = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      cloudinaryMessage = String(errorBody?.error?.message || cloudinaryMessage);
    } catch {}
    console.error("Cloudinary upload recusado:", cloudinaryMessage);
    throw new Error(`Falha no upload para o Cloudinary: ${cloudinaryMessage}`);
  }
  const result = await response.json();
  return String(result.secure_url || "");
}

async function createSellerProduct(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const seller = await getApprovedSeller(Number(user.id));
  if (!seller || seller.approval_status !== "approved") redirect("/minha-conta");

  const name = String(formData.get("name") || "").trim();
  const shortDescription = String(formData.get("short_description") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sku = String(formData.get("sku") || "").trim();
  const regularPrice = parsePrice(formData.get("regular_price"));
  const promoPrice = parsePrice(formData.get("promo_price"));
  const stockQuantity = Math.floor(parseNumber(formData.get("stock_quantity")) || 0);
  const minimumStock = Math.floor(parseNumber(formData.get("minimum_stock")) || 0);
  const weight = parseNumber(formData.get("weight"));
  const length = parseNumber(formData.get("length"));
  const width = parseNumber(formData.get("width"));
  const height = parseNumber(formData.get("height"));
  const originZip = String(formData.get("origin_zip") || "").replace(/\D/g, "").slice(0, 8);
  const images = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);

  if (!name) throw new Error("Informe o nome do produto.");
  if (shortDescription.length > 300) throw new Error("A descrição curta pode ter no máximo 300 caracteres.");
  if (regularPrice === null) throw new Error("Informe o preço do produto.");
  if (images.length === 0) throw new Error("Selecione pelo menos uma imagem do produto.");
  if (images.length > 6) throw new Error("Selecione no máximo 6 imagens.");
  for (const image of images) {
    if (!image.type.startsWith("image/")) throw new Error("Envie apenas arquivos de imagem.");
    if (image.size > 5 * 1024 * 1024) throw new Error("Cada imagem pode ter no máximo 5 MB.");
  }

  const sql = getDb();
  const slug = `${slugify(name)}-${seller.seller_id}-${Date.now()}`;
  const inserted = await sql`
    INSERT INTO products (
      name, slug, short_description, description, product_type, sale_mode, platform,
      regular_price, promo_price, seller_id, approval_status,
      sku, stock_quantity, minimum_stock, stock_tracking,
      weight, length, width, height, origin_zip,
      active, featured, updated_at
    ) VALUES (
      ${name}, ${slug}, ${shortDescription || null}, ${description || null}, 'FISICO', 'OWN', 'proprio',
      ${regularPrice}, ${promoPrice}, ${seller.seller_id}, 'pending',
      ${sku || null}, ${stockQuantity}, ${minimumStock}, TRUE,
      ${weight}, ${length}, ${width}, ${height}, ${originZip || null},
      FALSE, FALSE, NOW()
    ) RETURNING id
  `;
  const productId = Number((inserted[0] as any).id);

  try {
    for (let index = 0; index < images.length; index++) {
      const imageUrl = await uploadToCloudinary(images[index], name);
      await sql`
        INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
        VALUES (${productId}, ${imageUrl}, ${name}, ${index + 1})
      `;
    }
  } catch (error) {
    await sql`DELETE FROM products WHERE id = ${productId}`;
    throw error;
  }

  redirect("/vendedor");
}

export default async function NovoProdutoVendedorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const seller = await getApprovedSeller(Number(user.id));
  if (!seller || seller.approval_status !== "approved") redirect("/minha-conta");

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 820, margin: "0 auto" }}>
        <a href="/vendedor" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Painel do vendedor</a>
        <h1 style={{ margin: "14px 0 4px", fontSize: 34 }}>Cadastrar novo produto</h1>
        <p style={{ margin: "0 0 22px", color: "#64748b" }}>Loja: {seller.store_name || "Minha loja"}. O produto será enviado para aprovação da SHILMASTORE.</p>
        <form action={createSellerProduct} style={{ display: "grid", gap: 18 }}>
          <section style={cardStyle}>
            <h2 style={titleStyle}>Informações do produto</h2>
            <div style={gridStyle}>
              <label style={fieldStyle}><span style={labelStyle}>Nome do produto *</span><input name="name" required style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>SKU</span><input name="sku" style={inputStyle}/></label>
              <label style={{...fieldStyle, gridColumn:"1 / -1"}}><span style={labelStyle}>Descrição curta</span><textarea name="short_description" rows={2} maxLength={300} placeholder="Resumo do produto para cartões e listagens. Máximo de 300 caracteres." style={inputStyle}/></label>
              <label style={{...fieldStyle, gridColumn:"1 / -1"}}><span style={labelStyle}>Descrição completa</span><textarea name="description" rows={5} style={inputStyle}/></label>
            </div>
          </section>
          <section style={cardStyle}>
            <h2 style={titleStyle}>Imagens do produto</h2>
            <label style={fieldStyle}><span style={labelStyle}>Fotos *</span><input name="images" type="file" accept="image/*" multiple required style={inputStyle}/><small style={{color:"#64748b"}}>Selecione de 1 a 6 imagens do seu computador. Máximo de 5 MB por imagem. A primeira será a principal.</small></label>
          </section>
          <section style={cardStyle}>
            <h2 style={titleStyle}>Preço e estoque</h2>
            <div style={gridStyle}>
              <label style={fieldStyle}><span style={labelStyle}>Preço *</span><input name="regular_price" required inputMode="decimal" placeholder="Ex.: 199,90" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Preço promocional</span><input name="promo_price" inputMode="decimal" placeholder="Opcional" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Estoque *</span><input name="stock_quantity" required type="number" min="0" defaultValue="0" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Estoque mínimo *</span><input name="minimum_stock" required type="number" min="0" defaultValue="0" style={inputStyle}/></label>
            </div>
          </section>
          <section style={cardStyle}>
            <h2 style={titleStyle}>Envio do produto físico</h2>
            <div style={gridStyle}>
              <label style={fieldStyle}><span style={labelStyle}>Peso (kg)</span><input name="weight" inputMode="decimal" placeholder="Ex.: 0,5" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Comprimento (cm)</span><input name="length" inputMode="decimal" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Largura (cm)</span><input name="width" inputMode="decimal" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>Altura (cm)</span><input name="height" inputMode="decimal" style={inputStyle}/></label>
              <label style={fieldStyle}><span style={labelStyle}>CEP de origem</span><input name="origin_zip" inputMode="numeric" maxLength={9} placeholder="00000-000" style={inputStyle}/></label>
            </div>
          </section>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 14, color: "#9a3412" }}>Ao salvar, o produto ficará <strong>pendente</strong>. Ele só poderá aparecer na vitrine depois da aprovação do administrador.</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/vendedor" style={{ ...buttonStyle, background: "#e2e8f0", color: "#334155", textDecoration: "none" }}>Cancelar</a>
            <button type="submit" style={{ ...buttonStyle, background: "#1f5bbb", color: "white", border: 0 }}>Enviar produto para aprovação</button>
          </div>
        </form>
      </section>
    </main>
  );
}

const cardStyle = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22, boxShadow: "0 10px 30px #0000000a" };
const titleStyle = { margin: "0 0 16px", fontSize: 22 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 };
const fieldStyle = { display: "grid", gap: 7 };
const labelStyle = { fontWeight: 800, color: "#172554" };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 13px", font: "inherit", background: "white" };
const buttonStyle = { display: "inline-block", borderRadius: 10, padding: "13px 18px", fontWeight: 900, cursor: "pointer" };
