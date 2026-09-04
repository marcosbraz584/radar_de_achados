import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type MercadoLivrePrice = { type?: string; amount?: number; regular_amount?: number | null; currency_id?: string; conditions?: { context_restrictions?: string[] } };
type CatalogOffer = { item_id?: string; price?: number; original_price?: number | null; condition?: string };

async function fetchWithToken(url: string, token: string) { return fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); }
function choosePrice(prices: MercadoLivrePrice[]) {
  const marketplace = prices.filter((price) => { const restrictions = Array.isArray(price?.conditions?.context_restrictions) ? price.conditions.context_restrictions : []; return restrictions.length === 0 || restrictions.includes("channel_marketplace"); });
  return marketplace.find((price) => price.type === "promotion" && typeof price.amount === "number") || marketplace.find((price) => price.type === "standard" && typeof price.amount === "number") || marketplace.find((price) => typeof price.amount === "number") || null;
}
async function getDirectPrice(itemId: string, token: string) {
  let response = await fetchWithToken(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/sale_price?context=channel_marketplace`, token);
  if (response.ok) { const data = await response.json(); if (typeof data?.amount === "number") return { ok: true, status: response.status, price: data.amount, regularPrice: typeof data?.regular_amount === "number" ? data.regular_amount : null, itemId, source: "item" }; }
  const firstStatus = response.status;
  response = await fetchWithToken(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/prices`, token);
  if (response.ok) { const data = await response.json(); const selected = choosePrice(Array.isArray(data?.prices) ? data.prices : []); if (selected && typeof selected.amount === "number") return { ok: true, status: response.status, price: selected.amount, regularPrice: typeof selected.regular_amount === "number" ? selected.regular_amount : null, itemId, source: "item" }; }
  return { ok: false, status: response.status || firstStatus, price: null, regularPrice: null, itemId, source: "item" };
}
async function getCatalogPrice(catalogId: string, preferredItemId: string, token: string) {
  const response = await fetchWithToken(`https://api.mercadolibre.com/products/${encodeURIComponent(catalogId)}/items`, token);
  if (!response.ok) return { ok: false, status: response.status, price: null, regularPrice: null, itemId: preferredItemId, source: "catalog" };
  const data = await response.json();
  const offers: CatalogOffer[] = Array.isArray(data?.results) ? data.results : [];
  const valid = offers.filter(o => typeof o.item_id === "string" && (!o.condition || o.condition === "new"));
  const preferred = valid.find(o => o.item_id === preferredItemId && typeof o.price === "number");
  const selected = preferred || valid.filter(o => typeof o.price === "number").sort((a,b)=>(a.price ?? Infinity)-(b.price ?? Infinity))[0];
  if (!selected?.item_id || typeof selected.price !== "number") return { ok: false, status: response.status, price: null, regularPrice: null, itemId: preferredItemId, source: "catalog" };
  const direct = await getDirectPrice(selected.item_id, token);
  if (direct.ok) return direct;
  return { ok: true, status: 200, price: selected.price, regularPrice: typeof selected.original_price === "number" ? selected.original_price : null, itemId: selected.item_id, source: "catalog" };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const productId = Number(body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) return NextResponse.json({ ok: false, error: "Produto invalido." }, { status: 400 });
  const sql = getDb();
  const rows = await sql`SELECT id, marketplace_item_id, marketplace_product_id, regular_price, promo_price FROM products WHERE id=${productId} LIMIT 1`;
  const product = rows[0] as { id?: number; marketplace_item_id?: string|null; marketplace_product_id?: string|null; regular_price?: number|string|null; promo_price?: number|string|null }|undefined;
  if (!product?.marketplace_item_id) return NextResponse.json({ ok:false,error:"Produto sem codigo MLB da oferta." },{status:400});

  let token = await getMercadoLivreAccessToken();
  let result = await getDirectPrice(String(product.marketplace_item_id), token);
  if (result.status === 401) { token = await getMercadoLivreAccessToken(true); result = await getDirectPrice(String(product.marketplace_item_id), token); }
  if (!result.ok && product.marketplace_product_id) result = await getCatalogPrice(String(product.marketplace_product_id), String(product.marketplace_item_id), token);

  if (!result.ok || result.price == null) {
    const status = result.status === 403 ? "restricted" : "error";
    await sql`UPDATE products SET price_sync_status=${status},price_checked_at=NOW(),last_synced_at=NOW() WHERE id=${productId}`;
    return NextResponse.json({ok:result.status===403,status,pricePreserved:true},{status:result.status===403?200:502});
  }
  const currentPromo=product.promo_price==null?null:Number(product.promo_price); const currentRegular=product.regular_price==null?null:Number(product.regular_price); const priceChanged=currentPromo!==result.price;
  if(priceChanged) await sql`INSERT INTO price_history(product_id,regular_price,promo_price,source) VALUES (${productId},${currentRegular},${currentPromo},'automatic')`;
  await sql`UPDATE products SET promo_price=${result.price},regular_price=COALESCE(${result.regularPrice},regular_price),marketplace_item_id=${result.itemId},price_source='automatic',price_sync_status='ok',price_checked_at=NOW(),last_synced_at=NOW(),updated_at=NOW() WHERE id=${productId}`;
  return NextResponse.json({ok:true,status:"ok",price:result.price,regularPrice:result.regularPrice,historyRecorded:priceChanged,source:result.source});
}
