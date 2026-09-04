import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MercadoLivrePrice = {
  type?: string;
  amount?: number;
  regular_amount?: number | null;
  conditions?: { context_restrictions?: string[] };
};

type ProductRow = {
  id: number;
  marketplace_item_id: string;
  regular_price: number | string | null;
  promo_price: string | number | null;
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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const products = (await sql`
    SELECT id, marketplace_item_id, regular_price, promo_price
    FROM products
    WHERE active=TRUE
      AND sync_enabled=TRUE
      AND platform='mercado_livre'
      AND marketplace_item_id IS NOT NULL
    ORDER BY COALESCE(price_checked_at, '1970-01-01'::timestamp) ASC
    LIMIT 50
  `) as ProductRow[];

  let token = await getMercadoLivreAccessToken();
  let updated = 0;
  let restricted = 0;
  let errors = 0;
  let historyRecorded = 0;

  for (const product of products) {
    let result = await getCurrentPrice(String(product.marketplace_item_id), token);
    if (result.status === 401) {
      token = await getMercadoLivreAccessToken(true);
      result = await getCurrentPrice(String(product.marketplace_item_id), token);
    }

    if (!result.ok || result.price == null) {
      const status = result.status === 403 ? "restricted" : "error";
      await sql`
        UPDATE products
        SET price_sync_status=${status}, price_checked_at=NOW(), last_synced_at=NOW()
        WHERE id=${product.id}
      `;
      if (result.status === 403) restricted += 1;
      else errors += 1;
      continue;
    }

    const currentPromo = product.promo_price == null ? null : Number(product.promo_price);
    const currentRegular = product.regular_price == null ? null : Number(product.regular_price);
    const priceChanged = currentPromo !== result.price;

    if (priceChanged) {
      await sql`
        INSERT INTO price_history(product_id, regular_price, promo_price, source)
        VALUES (${product.id}, ${currentRegular}, ${currentPromo}, 'automatic')
      `;
      historyRecorded += 1;
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
      WHERE id=${product.id}
    `;
    updated += 1;
  }

  return NextResult({
    ok: true,
    checked: products.length,
    updated,
    restricted,
    errors,
    historyRecorded,
  });
}

function NextResult(body: Record<string, unknown>) {
  return NextResponse.json(body);
}
