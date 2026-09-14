import { redirect } from "next/navigation";
import { createSession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

async function login(formData: FormData) {
  "use server";

  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/entrar?erro=Informe%20e-mail%20e%20senha.");
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, password_hash, active
    FROM app_users
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `;

  const user = rows[0] as { id: number; password_hash: string | null; active: boolean } | undefined;

  if (!user || !user.active || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    redirect("/entrar?erro=E-mail%20ou%20senha%20inv%C3%A1lidos.");
  }

  await sql`UPDATE app_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ${Number(user.id)}`;
  await createSession(Number(user.id));
  redirect("/minha-conta");
}

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/minha-conta");
  const params = await searchParams;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "36px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 450, margin: "0 auto", background: "white", borderRadius: 18, padding: 28, boxShadow: "0 14px 40px #00000014", border: "1px solid #e5e7eb" }}>
        <a href="/" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Voltar para a SHILMASTORE</a>
        <h1 style={{ margin: "22px 0 6px", fontSize: 30 }}>Entrar</h1>
        <p style={{ margin: "0 0 22px", color: "#64748b", lineHeight: 1.5 }}>Acesse sua conta da SHILMASTORE.</p>

        {params.erro ? <div style={{ padding: 12, marginBottom: 18, borderRadius: 10, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontWeight: 700 }}>{params.erro}</div> : null}

        <form action={login} style={{ display: "grid", gap: 15 }}>
          <label style={{ display: "grid", gap: 6 }}><strong>E-mail</strong><input name="email" type="email" required autoComplete="email" style={inputStyle}/></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Senha</strong><input name="password" type="password" required autoComplete="current-password" style={inputStyle}/></label>
          <button type="submit" style={buttonStyle}>Entrar</button>
        </form>

        <p style={{ textAlign: "center", margin: "20px 0 0", color: "#64748b" }}>Ainda não tem conta? <a href="/cadastro" style={{ color: "#174ea6", fontWeight: 800 }}>Criar conta</a></p>
      </section>
    </main>
  );
}

const inputStyle = { width: "100%", padding: "12px 13px", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 15, outline: "none" };
const buttonStyle = { marginTop: 5, border: 0, borderRadius: 10, padding: "13px 16px", background: "#174ea6", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" };
