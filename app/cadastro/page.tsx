import { redirect } from "next/navigation";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

async function register(formData: FormData) {
  "use server";

  const fullName = String(formData.get("full_name") || "").trim();
  const email = cleanEmail(formData.get("email"));
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (fullName.length < 3) redirect("/cadastro?erro=Informe%20seu%20nome%20completo.");
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/cadastro?erro=Informe%20um%20e-mail%20v%C3%A1lido.");
  if (password.length < 8) redirect("/cadastro?erro=A%20senha%20deve%20ter%20pelo%20menos%208%20caracteres.");
  if (password !== confirmPassword) redirect("/cadastro?erro=As%20senhas%20n%C3%A3o%20coincidem.");

  const sql = getDb();
  const existing = await sql`SELECT id FROM app_users WHERE LOWER(email) = ${email} LIMIT 1`;
  if (existing.length) redirect("/cadastro?erro=Este%20e-mail%20j%C3%A1%20est%C3%A1%20cadastrado.");

  try {
    const rows = await sql`
      INSERT INTO app_users (full_name, email, phone, role, active, password_hash, updated_at)
      VALUES (${fullName}, ${email}, ${phone || null}, 'customer', TRUE, ${hashPassword(password)}, NOW())
      RETURNING id
    `;
    const userId = Number(rows[0]?.id);
    if (!userId) throw new Error("Não foi possível criar o usuário.");
    await createSession(userId);
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    redirect("/cadastro?erro=N%C3%A3o%20foi%20poss%C3%ADvel%20criar%20a%20conta.%20Tente%20novamente.");
  }

  redirect("/minha-conta");
}

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/minha-conta");
  const params = await searchParams;

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "36px 16px", color: "#172554" }}>
      <section style={{ maxWidth: 470, margin: "0 auto", background: "white", borderRadius: 18, padding: 28, boxShadow: "0 14px 40px #00000014", border: "1px solid #e5e7eb" }}>
        <a href="/" style={{ textDecoration: "none", color: "#174ea6", fontWeight: 800 }}>← Voltar para a SHILMASTORE</a>
        <h1 style={{ margin: "22px 0 6px", fontSize: 30 }}>Criar sua conta</h1>
        <p style={{ margin: "0 0 22px", color: "#64748b", lineHeight: 1.5 }}>Cadastre-se para comprar e, futuramente, solicitar sua conta de vendedor.</p>

        {params.erro ? <div style={{ padding: 12, marginBottom: 18, borderRadius: 10, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontWeight: 700 }}>{params.erro}</div> : null}

        <form action={register} style={{ display: "grid", gap: 15 }}>
          <label style={{ display: "grid", gap: 6 }}><strong>Nome completo</strong><input name="full_name" required minLength={3} autoComplete="name" style={inputStyle}/></label>
          <label style={{ display: "grid", gap: 6 }}><strong>E-mail</strong><input name="email" type="email" required autoComplete="email" style={inputStyle}/></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Telefone</strong><input name="phone" autoComplete="tel" style={inputStyle}/></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Senha</strong><input name="password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle}/><small style={{ color: "#64748b" }}>Mínimo de 8 caracteres.</small></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Confirmar senha</strong><input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle}/></label>
          <button type="submit" style={buttonStyle}>Criar conta</button>
        </form>

        <p style={{ textAlign: "center", margin: "20px 0 0", color: "#64748b" }}>Já tem conta? <a href="/entrar" style={{ color: "#174ea6", fontWeight: 800 }}>Entrar</a></p>
      </section>
    </main>
  );
}

const inputStyle = { width: "100%", padding: "12px 13px", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 15, outline: "none" };
const buttonStyle = { marginTop: 5, border: 0, borderRadius: 10, padding: "13px 16px", background: "#174ea6", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" };
