import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import AdminSidebar from "../AdminSidebar";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "admin") redirect("/minha-conta");
  return user;
}

async function updateSellerStatus(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const sellerId = Number(formData.get("seller_id"));
  const nextStatus = String(formData.get("status") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!Number.isInteger(sellerId) || sellerId <= 0) redirect("/admin/vendedores?erro=Vendedor%20inv%C3%A1lido.");
  if (!['approved', 'rejected', 'suspended'].includes(nextStatus)) redirect("/admin/vendedores?erro=Status%20inv%C3%A1lido.");

  const sql = getDb();
  const rows = await sql`
    SELECT s.id, s.user_id, s.approval_status, u.role
    FROM sellers s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.id = ${sellerId}
    LIMIT 1
  `;

  if (!rows.length) redirect("/admin/vendedores?erro=Solicita%C3%A7%C3%A3o%20n%C3%A3o%20encontrada.");

  const seller = rows[0] as any;
  const oldStatus = String(seller.approval_status || "pending");

  await sql`
    UPDATE sellers
    SET approval_status = ${nextStatus},
        approval_notes = ${notes || null},
        approved_at = ${nextStatus === 'approved' ? new Date() : null},
        approved_by = ${admin.id},
        updated_at = NOW()
    WHERE id = ${sellerId}
  `;

  await sql`
    INSERT INTO seller_status_history (seller_id, old_status, new_status, notes, changed_by)
    VALUES (${sellerId}, ${oldStatus}, ${nextStatus}, ${notes || null}, ${admin.id})
  `;

  if (nextStatus === 'approved' && seller.role !== 'admin') {
    await sql`UPDATE app_users SET role = 'seller', updated_at = NOW() WHERE id = ${seller.user_id}`;
  }

  if (nextStatus !== 'approved' && seller.role === 'seller') {
    await sql`UPDATE app_users SET role = 'customer', updated_at = NOW() WHERE id = ${seller.user_id}`;
  }

  redirect(`/admin/vendedores?ok=${nextStatus}`);
}

function statusLabel(value: string) {
  if (value === 'approved') return 'Aprovado';
  if (value === 'rejected') return 'Rejeitado';
  if (value === 'suspended') return 'Suspenso';
  return 'Pendente';
}

function statusColor(value: string) {
  if (value === 'approved') return '#166534';
  if (value === 'rejected' || value === 'suspended') return '#b42318';
  return '#a16207';
}

export default async function VendedoresPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const sql = getDb();

  const sellers = await sql`
    SELECT
      s.id,
      s.approval_status,
      s.approval_notes,
      s.created_at,
      u.full_name,
      u.email,
      u.phone,
      ss.store_name,
      ss.document_type,
      ss.document_number,
      ss.contact_phone,
      ss.city,
      ss.state
    FROM sellers s
    JOIN app_users u ON u.id = s.user_id
    LEFT JOIN seller_stores ss ON ss.seller_id = s.id
    ORDER BY
      CASE WHEN s.approval_status = 'pending' THEN 0 ELSE 1 END,
      s.created_at DESC
  `;

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">MARKETPLACE</p>
            <h1>Vendedores</h1>
            <p className="admin-subtitle">Analise e aprove as solicitações de vendedores da SHILMASTORE.</p>
          </div>
        </header>

        {params.erro ? <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', fontWeight: 700 }}>{params.erro}</div> : null}
        {params.ok ? <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#166534', fontWeight: 700 }}>Status do vendedor atualizado com sucesso.</div> : null}

        <section className="admin-panel">
          <div className="products-toolbar">
            <div><strong>{sellers.length}</strong> vendedor{sellers.length === 1 ? '' : 'es'}</div>
            <span className="db-status"><i /> Banco conectado</span>
          </div>

          {sellers.length === 0 ? (
            <div className="empty-state">
              <h2>Nenhuma solicitação de vendedor</h2>
              <p>As novas solicitações aparecerão aqui.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {sellers.map((seller: any) => (
                <article key={seller.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, background: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ margin: '0 0 6px', fontSize: 19 }}>{seller.store_name || 'Loja sem nome'}</h2>
                      <div style={{ color: '#475569', lineHeight: 1.6 }}>
                        <div><strong>Responsável:</strong> {seller.full_name}</div>
                        <div><strong>E-mail:</strong> {seller.email}</div>
                        <div><strong>Telefone:</strong> {seller.contact_phone || seller.phone || 'Não informado'}</div>
                        <div><strong>Documento:</strong> {seller.document_type || '-'} {seller.document_number || ''}</div>
                        <div><strong>Local:</strong> {[seller.city, seller.state].filter(Boolean).join(' / ') || 'Não informado'}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: statusColor(String(seller.approval_status)) }}>
                      {statusLabel(String(seller.approval_status))}
                    </div>
                  </div>

                  <form action={updateSellerStatus} style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                    <input type="hidden" name="seller_id" value={seller.id} />
                    <label style={{ display: 'grid', gap: 6 }}>
                      <strong style={{ fontSize: 13 }}>Observação do administrador</strong>
                      <textarea name="notes" defaultValue={seller.approval_notes || ''} rows={2} style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 9, resize: 'vertical' }} />
                    </label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button name="status" value="approved" type="submit" style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#166534', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Aprovar</button>
                      <button name="status" value="rejected" type="submit" style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#b42318', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Rejeitar</button>
                      {seller.approval_status === 'approved' ? <button name="status" value="suspended" type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 14px', background: 'white', color: '#334155', fontWeight: 800, cursor: 'pointer' }}>Suspender</button> : null}
                    </div>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
