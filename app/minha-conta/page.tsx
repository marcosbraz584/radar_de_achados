import { redirect } from "next/navigation";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await destroySession();
  redirect("/entrar");
}

function sellerStatusLabel(value: string) {
  if (value === "approved") return "Aprovado";
  if (value === "rejected") return "Rejeitado";
  if (value === "suspended") return "Suspenso";
  return "Pendente";
}

export default async function MinhaContaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const sql = getDb();
  const sellerRows = await sql`
    SELECT s.id, s.approval_status, s.approval_notes, st.store_name
    FROM sellers s
    LEFT JOIN seller_stores st ON st.seller_id = s.id
    WHERE s.user_id = ${user.id}
    LIMIT 1
  `;
  const seller = sellerRows[0] as any | undefined;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "36px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 560, margin: "0 auto", background: "white", borderRadius: 18, padding: 28, boxShadow: "0 14px 40px #00000014", border: "1px solid #e5e7eb" }}>
        <a href="/" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Voltar para a SHILMASTORE</a>
        <h1 style={{ margin: "22px 0 6px", fontSize: 30 }}>Minha conta</h1>
        <p style={{ margin: "0 0 24px", color: "#64748b" }}>Sua sessão está ativa na SHILMASTORE.</p>

        <div style={{ display: "grid", gap: 12, padding: 18, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div><strong>Nome:</strong> {user.full_name}</div>
          <div><strong>E-mail:</strong> {user.email}</div>
          <div><strong>Telefone:</strong> {user.phone || "Não informado"}</div>
          <div><strong>Perfil:</strong> {user.role === "admin" ? "Administrador" : user.role === "seller" ? "Vendedor" : "Cliente"}</div>
        </div>

        <div style={{ marginTop: 20, padding: 18, borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Área de vendedor</h2>
          {!seller ? (
            <>
              <p style={{ margin: "0 0 14px", color: "#64748b", lineHeight: 1.5 }}>Quer anunciar produtos na SHILMASTORE? Envie sua solicitação de vendedor para análise.</p>
              <a href="/quero-vender" style={{ display: "inline-block", textDecoration: "none", borderRadius: 10, padding: "12px 16px", background: "#174ea6", color: "white", fontWeight: 900 }}>Quero vender na SHILMASTORE</a>
            </>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div><strong>Loja:</strong> {seller.store_name || "Não informada"}</div>
              <div><strong>Status:</strong> {sellerStatusLabel(String(seller.approval_status))}</div>
              {seller.approval_status === "pending" ? <p style={{ margin: 0, color: "#8a5b00" }}>Sua solicitação está aguardando análise do administrador.</p> : null}
              {seller.approval_status === "rejected" && seller.approval_notes ? <p style={{ margin: 0, color: "#9f1239" }}>{seller.approval_notes}</p> : null}
              {seller.approval_status === "approved" ? <p style={{ margin: 0, color: "#08783e", fontWeight: 700 }}>Sua conta de vendedor foi aprovada.</p> : null}
            </div>
          )}
        </div>

        <form action={logout} style={{ marginTop: 22 }}>
          <button type="submit" style={{ width: "100%", border: 0, borderRadius: 10, padding: "12px 16px", background: "#172554", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>Sair da conta</button>
        </form>
      </section>
    </main>
  );
}
