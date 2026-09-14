import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

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
      </section>
    </main>
  );
}
