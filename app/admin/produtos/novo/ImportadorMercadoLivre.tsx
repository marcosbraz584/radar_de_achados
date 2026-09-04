"use client";

import { useState } from "react";

type Preview = {
  ok: boolean;
  type?: string;
  error?: string;
  product?: {
    id?: string | null;
    catalog_product_id?: string | null;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    permalink?: string | null;
    price?: number | null;
    original_price?: number | null;
    pictures?: string[];
  };
  automation?: {
    note?: string;
    price?: boolean;
    description?: boolean;
    item_access_status?: number | null;
    price_access_status?: number | null;
    catalog_fallback?: boolean;
  };
};

type SearchResult = {
  id: string;
  name?: string | null;
  status?: string | null;
  image?: string | null;
  pictures?: string[];
  features?: string[];
  permalink?: string | null;
  offer_item_id?: string | null;
  offer_price?: number | null;
  offer_original_price?: number | null;
  currency_id?: string | null;
  offers_count?: number;
};

type SearchResponse = { ok: boolean; error?: string; total?: number; results?: SearchResult[] };

function formatPrice(value?: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ImportadorMercadoLivre() {
  const [mode, setMode] = useState<"search" | "link">("search");
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  function setValue(name: string, value: string) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (el) el.value = value;
  }

  function fillForm(data: Preview, fallbackUrl: string) {
    if (!data?.ok || !data?.product) return;
    const product = data.product;
    const hasAutomaticPrice = data?.automation?.price === true && product.price != null;
    const restricted = data?.automation?.item_access_status === 403 || data?.automation?.price_access_status === 403;
    const catalogId = product.catalog_product_id || (data.type === "catalog_product" ? product.id || "" : "");
    const itemId = data.type === "item" ? product.id || "" : product.id || "";

    setValue("name", product.name || "");
    setValue("description", product.description || "");
    setValue("marketplace_item_id", itemId);
    setValue("marketplace_product_id", catalogId);
    setValue("marketplace_reference_type", catalogId && itemId !== catalogId ? "item" : "catalog_product");
    setValue("marketplace_url", product.permalink || fallbackUrl.split("#")[0]);
    setValue("imported_images", JSON.stringify(Array.isArray(product.pictures) ? product.pictures : []));
    setValue("price_source", hasAutomaticPrice ? "automatic" : "manual");
    setValue("price_sync_status", hasAutomaticPrice ? "ok" : restricted ? "restricted" : "pending");
    setValue("price_checked_at", new Date().toISOString());
    setValue("regular_price", product.original_price != null ? String(product.original_price) : "");
    setValue("promo_price", product.price != null ? String(product.price) : "");
  }

  async function importValue(value: string) {
    if (!value.trim()) return;
    setLoading(true); setPreview(null);
    try {
      const response = await fetch(`/api/mercadolivre/import-preview?value=${encodeURIComponent(value.trim())}`);
      const data: Preview = await response.json();
      setPreview(data); fillForm(data, value.trim());
    } catch { setPreview({ ok: false, error: "Não foi possível consultar o Mercado Livre agora." }); }
    finally { setLoading(false); }
  }

  async function searchProducts() {
    if (query.trim().length < 2) return;
    setSearching(true); setSearchError(""); setResults([]); setPreview(null);
    try {
      const response = await fetch(`/api/mercadolivre/product-search?q=${encodeURIComponent(query.trim())}`);
      const data: SearchResponse = await response.json();
      if (!data.ok) { setSearchError(data.error || "Não foi possível pesquisar agora."); return; }
      setResults(Array.isArray(data.results) ? data.results : []);
      if (!data.results?.length) setSearchError("Nenhum produto encontrado para essa busca.");
    } catch { setSearchError("Não foi possível pesquisar o Mercado Livre agora."); }
    finally { setSearching(false); }
  }

  async function selectProduct(product: SearchResult) {
    const url = product.permalink || `https://www.mercadolivre.com.br/p/${product.id}`;
    const importReference = product.offer_item_id ? `${url}#wid=${product.offer_item_id}` : url;
    setLink(url); await importValue(importReference); setResults([]);
  }

  const tabStyle = (active: boolean) => ({ border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", background: active ? "#111827" : "#fff", color: active ? "#fff" : "#111827", fontWeight: 700, cursor: "pointer" } as const);

  return (
    <section className="form-card ml-import-card">
      <div className="ml-import-heading"><div><p className="eyebrow">IMPORTAÇÃO AUTOMÁTICA</p><h2>Buscar no Mercado Livre</h2><p className="admin-subtitle">Pesquise pelo nome do produto ou cole um link do Mercado Livre.</p></div><span className="ml-badge">Mercado Livre conectado</span></div>
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}><button type="button" style={tabStyle(mode === "search")} onClick={() => setMode("search")}>Pesquisar por nome</button><button type="button" style={tabStyle(mode === "link")} onClick={() => setMode("link")}>Colar link</button></div>
      {mode === "search" ? <><div className="ml-import-row"><input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchProducts(); } }} placeholder="Ex.: ventilador, iPhone, notebook..."/><button type="button" className="primary-button" onClick={searchProducts} disabled={searching || query.trim().length < 2}>{searching ? "Pesquisando ofertas..." : "Pesquisar"}</button></div>{searchError ? <div className="ml-result ml-error"><strong>{searchError}</strong></div> : null}{results.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 }}>{results.map((product) => <button key={product.id} type="button" onClick={() => selectProduct(product)} disabled={loading} style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 7 }}><div style={{ height: 150, display: "grid", placeItems: "center", marginBottom: 4 }}>{product.image ? <img src={product.image} alt={product.name || "Produto"} style={{ maxWidth: "100%", maxHeight: 150, objectFit: "contain" }} /> : <span>Sem imagem</span>}</div><strong style={{ display: "block", lineHeight: 1.35 }}>{product.name || product.id}</strong><small style={{ color: "#6b7280" }}>Catálogo: {product.id}</small>{product.offer_price != null ? <strong style={{ fontSize: 18 }}>{formatPrice(product.offer_price)}</strong> : <small style={{ color: "#b45309" }}>Sem oferta com preço disponível</small>}{product.offer_item_id ? <small style={{ color: "#15803d" }}>Oferta: {product.offer_item_id}{product.offers_count ? ` · ${product.offers_count} encontrada(s)` : ""}</small> : null}{product.features?.length ? <small style={{ color: "#6b7280" }}>{product.features.join(" • ")}</small> : null}<span style={{ display: "inline-block", marginTop: "auto", paddingTop: 6, fontWeight: 800 }}>Selecionar produto →</span></button>)}</div> : null}</> : <div className="ml-import-row"><input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole aqui o link do produto do Mercado Livre"/><button type="button" className="primary-button" onClick={() => importValue(link)} disabled={loading || !link.trim()}>{loading ? "Buscando..." : "Buscar produto"}</button></div>}
      {loading ? <p className="admin-subtitle" style={{ marginTop: 14 }}>Carregando produto, descrição e preço...</p> : null}
      {preview && !preview.ok ? <div className="ml-result ml-error"><strong>Não foi possível importar.</strong><span>{preview.error}</span></div> : null}
      {preview?.ok && preview.product ? <div className="ml-result ml-success">{preview.product.pictures?.[0] ? <img src={preview.product.pictures[0]} alt="Prévia do produto" /> : null}<div><strong>{preview.product.name}</strong><span>{preview.type === "catalog_product" ? "Produto de catálogo" : "Oferta do Mercado Livre"} · {preview.product.status === "active" ? "Ativo" : preview.product.status || "Status não informado"}</span>{preview.product.price != null ? <span><strong>Preço encontrado: {formatPrice(preview.product.price)}</strong></span> : null}{preview.automation?.description ? <small>Descrição importada automaticamente.</small> : <small>Descrição não disponibilizada para esta oferta.</small>}{preview.automation?.note ? <small>{preview.automation.note}</small> : null}</div></div> : null}
    </section>
  );
}
