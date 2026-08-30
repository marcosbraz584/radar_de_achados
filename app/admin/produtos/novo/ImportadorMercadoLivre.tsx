"use client";

import { useState } from "react";

type Preview = {
  ok: boolean;
  type?: string;
  error?: string;
  product?: {
    id?: string | null;
    name?: string | null;
    status?: string | null;
    permalink?: string | null;
    price?: number | null;
    original_price?: number | null;
    pictures?: string[];
  };
  automation?: { note?: string };
};

export default function ImportadorMercadoLivre() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function buscar() {
    if (!link.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const response = await fetch(`/api/mercadolivre/import-preview?value=${encodeURIComponent(link.trim())}`);
      const data = await response.json();
      setPreview(data);

      if (data?.ok && data?.product) {
        const setValue = (name: string, value: string) => {
          const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
          if (el) el.value = value;
        };
        setValue("name", data.product.name || "");
        setValue("marketplace_item_id", data.product.id || "");
        setValue("marketplace_url", data.product.permalink || link.trim());
        if (data.product.original_price != null) setValue("regular_price", String(data.product.original_price));
        if (data.product.price != null) setValue("promo_price", String(data.product.price));
      }
    } catch {
      setPreview({ ok: false, error: "Não foi possível consultar o Mercado Livre agora." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-card ml-import-card">
      <div className="ml-import-heading">
        <div><p className="eyebrow">IMPORTAÇÃO AUTOMÁTICA</p><h2>Buscar no Mercado Livre</h2><p className="admin-subtitle">Cole o link do produto. O Radar preencherá automaticamente os dados que a API disponibilizar.</p></div>
        <span className="ml-badge">Mercado Livre conectado</span>
      </div>
      <div className="ml-import-row">
        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole aqui o link do produto do Mercado Livre" />
        <button type="button" className="primary-button" onClick={buscar} disabled={loading || !link.trim()}>{loading ? "Buscando..." : "Buscar produto"}</button>
      </div>
      {preview && !preview.ok && <div className="ml-result ml-error"><strong>Não foi possível importar.</strong><span>{preview.error}</span></div>}
      {preview?.ok && preview.product && <div className="ml-result ml-success">
        {preview.product.pictures?.[0] ? <img src={preview.product.pictures[0]} alt="Prévia do produto" /> : null}
        <div><strong>{preview.product.name}</strong><span>{preview.type === "catalog_product" ? "Produto de catálogo" : "Anúncio individual"} · {preview.product.status === "active" ? "Ativo" : preview.product.status || "Status não informado"}</span>{preview.automation?.note ? <small>{preview.automation.note}</small> : null}</div>
      </div>}
    </section>
  );
}
