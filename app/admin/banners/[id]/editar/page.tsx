import { getDb } from "@/lib/db";
import { isBannerFile, uploadBannerImage } from "@/lib/banner-storage";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminSidebar from "../../../AdminSidebar";

export const dynamic = "force-dynamic";
const BANNER_SIZE = "936 × 260 px";

function localInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getBanner(id: number) {
  const sql = getDb();
  const rows = await sql`SELECT id,title,subtitle,image_url,target_url,active,sort_order,starts_at,expires_at FROM banners WHERE id=${id} LIMIT 1`;
  return rows[0] || null;
}

async function updateBanner(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim();
  let imageUrl = String(formData.get("image_url") || "").trim();
  const imageFile = formData.get("image_file");
  const targetUrl = String(formData.get("target_url") || "").trim();
  const sortRaw = Number(formData.get("sort_order") || 9999);
  const sortOrder = Number.isInteger(sortRaw) && sortRaw >= 0 ? sortRaw : 9999;
  const startsAt = parseDate(formData.get("starts_at"));
  const expiresAt = parseDate(formData.get("expires_at"));
  const active = formData.get("active") === "on";

  if (!Number.isInteger(id) || id <= 0) throw new Error("Banner inválido.");

  if (isBannerFile(imageFile)) {
    imageUrl = await uploadBannerImage(imageFile);
  }

  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    throw new Error("Selecione uma imagem do computador ou informe uma URL HTTPS válida.");
  }
  if (targetUrl && !/^https:\/\//i.test(targetUrl)) {
    throw new Error("Informe uma URL HTTPS válida para o destino.");
  }
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw new Error("A validade final deve ser posterior ao início.");
  }

  const sql = getDb();
  await sql`UPDATE banners SET title=${title || null},subtitle=${subtitle || null},image_url=${imageUrl},target_url=${targetUrl || null},sort_order=${sortOrder},starts_at=${startsAt},expires_at=${expiresAt},active=${active},updated_at=NOW() WHERE id=${id}`;
  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export default async function EditarBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const banner: any = await getBanner(id);
  if (!banner) notFound();

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">VITRINE</p>
            <h1>Editar banner</h1>
            <p className="admin-subtitle">Atualize a arte, o destino e o período de exibição.</p>
          </div>
          <a className="secondary-button" href="/admin/banners">← Voltar</a>
        </header>

        <form action={updateBanner} className="product-form">
          <input type="hidden" name="id" value={banner.id} />
          <section className="form-card">
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a" }}>
              <strong>Dimensão recomendada: {BANNER_SIZE}</strong>
              <br />
              <small>Mantenha essa proporção para evitar cortes ou deformações no site.</small>
            </div>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Título</span>
                <input name="title" defaultValue={banner.title || ""} />
              </label>
              <label className="field">
                <span>Ordem</span>
                <input name="sort_order" type="number" min="0" defaultValue={banner.sort_order ?? 9999} />
              </label>
              <label className="field field-full">
                <span>Subtítulo</span>
                <input name="subtitle" defaultValue={banner.subtitle || ""} />
              </label>

              <div className="field field-full">
                <span>Imagem atual</span>
                <img src={banner.image_url} alt={banner.title || "Banner atual"} style={{ width: "100%", maxWidth: 468, aspectRatio: "936 / 260", objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0", marginTop: 8 }} />
              </div>

              <label className="field field-full">
                <span>Substituir por imagem do computador — {BANNER_SIZE}</span>
                <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
                <small>JPG, PNG ou WEBP. Máximo 4 MB. Deixe vazio para manter a imagem atual.</small>
              </label>

              <label className="field field-full">
                <span>URL da imagem</span>
                <input name="image_url" type="url" required defaultValue={banner.image_url} />
                <small>Se selecionar um arquivo acima, ele substituirá esta URL.</small>
              </label>

              <label className="field field-full">
                <span>Link de destino</span>
                <input name="target_url" type="url" defaultValue={banner.target_url || ""} />
              </label>
              <label className="field">
                <span>Início</span>
                <input type="datetime-local" name="starts_at" defaultValue={localInput(banner.starts_at)} />
              </label>
              <label className="field">
                <span>Validade</span>
                <input type="datetime-local" name="expires_at" defaultValue={localInput(banner.expires_at)} />
              </label>
              <div className="check-fields field-full">
                <label><input type="checkbox" name="active" defaultChecked={Boolean(banner.active)} /> Banner ativo</label>
              </div>
            </div>
          </section>

          <div className="form-actions">
            <a className="secondary-button" href="/admin/banners">Cancelar</a>
            <button className="primary-button" type="submit">Salvar alterações</button>
          </div>
        </form>
      </section>
    </main>
  );
}
