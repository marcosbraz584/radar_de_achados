import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function solicitarVenda(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const storeName = String(formData.get("store_name") || "").trim();
  const documentType = String(formData.get("document_type") || "").trim();
  const documentNumber = String(formData.get("document_number") || "").trim();
  const contactPhone = String(formData.get("contact_phone") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim().toUpperCase();

  if (storeName.length < 3) redirect("/quero-vender?erro=Informe%20o%20nome%20da%20loja.");
  if (!['CPF', 'CNPJ'].includes(documentType)) redirect("/quero-vender?erro=Selecione%20CPF%20ou%20CNPJ.");
  if (documentNumber.length < 11) redirect("/quero-vender?erro=Informe%20um%20CPF%20ou%20CNPJ%20v%C3%A1lido.");
  if (state && state.length !== 2) redirect("/quero-vender?erro=Informe%20a%20UF%20com%202%20letras.");

  const sql = getDb();
  const existing = await sql`SELECT id, approval_status FROM sellers WHERE user_id = ${user.id} LIMIT 1`;
  if (existing.length) redirect("/minha-conta");

  let sellerId: number | null = null;

  try {
    const sellerRows = await sql`
      INSERT INTO sellers (user_id, approval_status, created_at, updated_at)
      VALUES (${user.id}, 'pending', NOW(), NOW())
      RETURNING id
    `;

    sellerId = Number(sellerRows[0]?.id);
    if (!sellerId) throw new Error("Falha ao criar vendedor.");

    const baseSlug = slugify(storeName) || `loja-${user.id}`;
    const storeSlug = `${baseSlug}-${user.id}`;

    await sql`
      INSERT INTO seller_stores (
        seller_id, store_name, slug, contact_email, contact_phone,
        document_type, document_number, city, state, active,
        created_at, updated_at
      ) VALUES (
        ${sellerId}, ${storeName}, ${storeSlug}, ${user.email}, ${contactPhone || user.phone || null},
        ${documentType}, ${documentNumber}, ${city || null}, ${state || null}, TRUE,
        NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO seller_status_history (seller_id, old_status, new_status, notes, changed_by)
      VALUES (${sellerId}, NULL, 'pending', 'Solicitação enviada pelo cliente.', ${user.id})
    `;
  } catch (error) {
    console.error("Erro ao solicitar conta de vendedor:", error);
    if (sellerId) {
      try { await sql`DELETE FROM sellers WHERE id = ${sellerId}`; } catch {}
    }
    redirect("/quero-vender?erro=N%C3%A3o%20foi%20poss%C3%ADvel%20enviar%20a%20solicita%C3%A7%C3%A3o.%20Tente%20novamente.");
  }

  redirect("/minha-conta");
}

export default async function QueroVenderPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const sql = getDb();
  const existing = await sql`SELECT approval_status FROM sellers WHERE user_id = ${user.id} LIMIT 1`;
  if (existing.length) redirect("/minha-conta");

  const params = await searchParams;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "36px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 620, margin: "0 auto", background: "white", borderRadius: 18, padding: 28, boxShadow: "0 14px 40px #00000014", border: "1px solid #e5e7eb" }}>
        <a href="/minha-conta" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Voltar para Minha conta</a>
        <h1 style={{ margin: "22px 0 6px", fontSize: 30 }}>Quero vender na SHILMASTORE</h1>
        <p style={{ margin: "0 0 22px", color: "#64748b", lineHeight: 1.5 }}>Envie os dados básicos da sua loja. Sua solicitação ficará pendente até a análise do administrador.</p>

        {params.erro ? <div style={{ padding: 12, marginBottom: 18, borderRadius: 10, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontWeight: 700 }}>{params.erro}</div> : null}

        <form action={solicitarVenda} style={{ display: "grid", gap: 15 }}>
          <label style={{ display: "grid", gap: 6 }}><strong>Nome da loja *</strong><input name="store_name" required minLength={3} style={inputStyle}/></label>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}><strong>Documento *</strong><select name="document_type" required defaultValue="CPF" style={inputStyle}><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></label>
            <label style={{ display: "grid", gap: 6 }}><strong>Número *</strong><input name="document_number" required placeholder="Somente números" style={inputStyle}/></label>
          </div>
          <label style={{ display: "grid", gap: 6 }}><strong>Telefone da loja</strong><input name="contact_phone" defaultValue={user.phone || ""} autoComplete="tel" style={inputStyle}/></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}><strong>Cidade</strong><input name="city" style={inputStyle}/></label>
            <label style={{ display: "grid", gap: 6 }}><strong>UF</strong><input name="state" maxLength={2} placeholder="RN" style={inputStyle}/></label>
          </div>
          <button type="submit" style={buttonStyle}>Enviar solicitação</button>
        </form>
      </section>
    </main>
  );
}

const inputStyle = { width: "100%", padding: "12px 13px", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 15, outline: "none", background: "white" };
const buttonStyle = { marginTop: 6, border: 0, borderRadius: 10, padding: "13px 16px", background: "#174ea6", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" };
