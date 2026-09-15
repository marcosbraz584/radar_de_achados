import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VendedorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const sql = getDb();
  const rows = await sql`
    SELECT
      s.id AS seller_id,
      s.approval_status,
      st.id AS store_id,
      st.store_name,
      st.slug,
      st.contact_email,
      st.contact_phone,
      st.city,
      st.state,
      st.active
    FROM sellers s
    LEFT JOIN seller_stores st ON st.seller_id = s.id
    WHERE s.user_id = ${user.id}
    LIMIT 1
  `;

  if (!rows.length) redirect("/quero-vender");

  const seller = rows[0] as any;
  if (seller.approval_status !== "approved") redirect("/minha-conta");

  const productRows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS rejected
    FROM products
    WHERE seller_id = ${seller.seller_id}
  `;

  const stats = productRows[0] as any;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <a href="/minha-conta" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Minha conta</a>
            <h1 style={{ margin: "12px 0 4px", fontSize: 34 }}>Painel do vendedor</h1>
            <p style={{ margin: 0, color: "#64748b" }}>Gerencie sua operação na SHILMASTORE.</p>
          </div>
          <span style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 999, padding: "8px 12px", fontWeight: 800 }}>Vendedor aprovado</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <article style={cardStyle}>
            <div style={eyebrowStyle}>LOJA</div>
            <h2 style={{ margin: "6px 0 10px", fontSize: 22 }}>{seller.store_name || "Minha loja"}</h2>
            <div style={{ color: "#64748b", lineHeight: 1.6 }}>
              <div>{seller.city || "Cidade não informada"}{seller.state ? ` / ${seller.state}` : ""}</div>
              <div>{seller.contact_phone || "Telefone não informado"}</div>
              <div>{seller.contact_email || user.email}</div>
            </div>
          </article>

          <article style={cardStyle}>
            <div style={eyebrowStyle}>PRODUTOS</div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>{Number(stats?.total || 0)}</div>
            <div style={{ color: "#64748b" }}>produto(s) cadastrados pela sua loja</div>
          </article>

          <article style={cardStyle}>
            <div style={eyebrowStyle}>APROVAÇÃO</div>
            <div style={{ display: "grid", gap: 6, marginTop: 10, color: "#475569" }}>
              <div><strong>Pendentes:</strong> {Number(stats?.pending || 0)}</div>
              <div><strong>Aprovados:</strong> {Number(stats?.approved || 0)}</div>
              <div><strong>Rejeitados:</strong> {Number(stats?.rejected || 0)}</div>
            </div>
          </article>
        </div>

        <div style={{ marginTop: 18, background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22, boxShadow: "0 10px 30px #0000000a" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Produtos da loja</h2>
          <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.5 }}>
            Cadastre seus produtos. Todo novo produto ficará pendente até a análise e aprovação da SHILMASTORE.
          </p>
          <a href="/vendedor/produtos/novo" style={{ display: "inline-block", borderRadius: 10, padding: "12px 16px", background: "#1f5bbb", color: "white", fontWeight: 900, textDecoration: "none" }}>
            Cadastrar novo produto
          </a>
        </div>
      </section>
    </main>
  );
}

const cardStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 10px 30px #0000000a",
};

const eyebrowStyle = {
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.2,
};
