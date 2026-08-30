import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Produto invalido." }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, marketplace_item_id, regular_price, promo_price
    FROM products WHERE id=${productId} LIMIT 1
  `;
  const product: any = rows[0];
  if (!product?.marketplace_item_id) {
    return NextResponse.json({ ok: false, error: "Produto sem codigo MLB do anuncio." }, { status: 400 });
  }

  let token = await getMercadoLivreAccessToken();
  const itemId = String(product.marketplace_item_id);
  const getPrice = (accessToken: string) => fetch(
    `https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/sale_price?context=channel_marketplace`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );

  let response = await getPrice(token);
  if (response.status === 401) {
    token = await getMercadoLivreAccessToken(true);
    response = await getPrice(token);
  }

  if (response.status === 403) {
    await sql`UPDATE products SET price_sync_status='restricted', price_checked_at=NOW(), last_synced_at=NOW() WHERE id=${productId}`;
    return NextResponse.json({ ok: true, status: "restricted", pricePreserved: true });
  }

  if (!response.ok) {
    await sql`UPDATE products SET price_sync_status='error', price_checked_at=NOW(), last_synced_at=NOW() WHERE id=${productId}`;
    return NextResponse.json({ ok: false, status: "error", pricePreserved: true }, { status: 502 });
  }

  const data = await response.json();
  const price = Number(data?.amount ?? data?.price);
  if (!Number.isFinite(price) || price < 0) {
    await sql`UPDATE products SET price_sync_status='error', price_checked_at=NOW(), last_synced_at=NOW() WHERE id=${productId}`;
    return NextResponse.json({ ok: false, status: "error", pricePreserved: true }, { status: 502 });
  }

  await sql`
    UPDATE products SET promo_price=${price}, price_source='automatic', price_sync_status='ok',
      price_checked_at=NOW(), last_synced_at=NOW(), updated_at=NOW()
    WHERE id=${productId}
  `;
  return NextResponse.json({ ok: true, status: "ok", price });
}
