import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type MercadoLivrePrice = {
  type?: string;
  amount?: number;
  regular_amount?: number | null;
  currency_id?: string;
  conditions?: { context_restrictions?: string[] };
};

async function fetchWithToken(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}

function choosePrice(prices: MercadoLivrePrice[]) {
  const marketplace = prices.filter((price) => {
    const restrictions = Array.isArray(price?.conditions?.context_restrictions)
      ? price.conditions.context_restrictions
      : [];
    return restrictions.length === 0 || restrictions.includes("channel_marketplace");
  });
  return (
    marketplace.find((price) => price.type === "promotion" && typeof price.amount === "number") ||
    marketplace.find((price) => price.type === "standard" && typeof price.amount === "number") ||
    marketplace.find((price) => typeof price.amount === "number") ||
    null
  );
}

async function getCurrentPrice(itemId: string, token: string) {
  let response = await fetchWithToken(
    `https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/sale_price?context=channel_marketplace`,
    token,
  );

  if (response.ok) {
    const data = await response.json();
    if (typeof data?.amount === "number") {
      return {
        ok: true,
        status: response.status,
        price: data.amount,
        regularPrice: typeof data?.regular_amount === "number" ? data.regular_amount : null,
      };
    }
  }

  response = await fetchWithToken(
    `https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/prices`,
    token,
  );
  if (!response.ok) return { ok: false, status: response.status, price: null, regularPrice: null };

  const data = await response.json();
  const prices: MercadoLivrePrice[] = Array.isArray(data?.prices) ? data.prices : [];
  const selected = choosePrice(prices);
  if (!selected || typeof selected.amount !== "number") {
    return { ok: false, status: response.status, price: null, regularPrice: null };
  }

  return {
    ok: true,
    status: response.status,
    price: selected.amount,
    regularPrice: typeof selected.regular_amount === "number" ? selected.regular_amount : null,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Produto invalido." }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, marketplace_item_id, regular_price, promo_price
    FROM products
    WHERE id=${productId}
    LIMIT 1
  `;
  const product = rows[0] as {
    id?: number;
    marketplace_item_id?: string | null;
    regular_price?: number | string | null;
    promo_price?: number | string | null;
  } | undefined;

  if (!product?.marketplace_item_id) {
    return NextResponse.json({ ok: false, error: "Produto sem codigo MLB da oferta." }, { status: 400 });
  }

  let token = await getMercadoLivreAccessToken();
  const itemId = String(product.marketplace_item_id);
  let result = await getCurrentPrice(itemId, token);

  if (result.status === 401) {
    token = await getMercadoLivreAccessToken(true);
    result = await getCurrentPrice(itemId, token);
  }

  if (!result.ok || result.price == null) {
    const status = result.status === 403 ? "restricted" : "error";
    await sql`
      UPDATE products
      SET price_sync_status=${status}, price_checked_at=NOW(), last_synced_at=NOW()
      WHERE id=${productId}
    `;
    return NextResponse.json(
      { ok: result.status === 403, status, pricePreserved: true },
      { status: result.status === 403 ? 200 : 502 },
    );
  }

  const currentPromo = product.promo_price == null ? null : Number(product.promo_price);
  const currentRegular = product.regular_price == null ? null : Number(product.regular_price);
  const priceChanged = currentPromo !== result.price;

  if (priceChanged) {
    await sql`
      INSERT INTO price_history(product_id, regular_price, promo_price, source)
      VALUES (${productId}, ${currentRegular}, ${currentPromo}, 'automatic')
    `;
  }

  await sql`
    UPDATE products
    SET
      promo_price=${result.price},
      regular_price=COALESCE(${result.regularPrice}, regular_price),
      price_source='automatic',
      price_sync_status='ok',
      price_checked_at=NOW(),
      last_synced_at=NOW(),
      updated_at=NOW()
    WHERE id=${productId}
  `;

  return NextResponse.json({
    ok: true,
    status: "ok",
    price: result.price,
    regularPrice: result.regularPrice,
    historyRecorded: priceChanged,
  });
}
