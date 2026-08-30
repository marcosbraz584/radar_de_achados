import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function extractMercadoLivreId(value: string) {
  const decoded = decodeURIComponent(value).toUpperCase();
  const match = decoded.match(/MLB\d+/);
  return match?.[0] || null;
}

async function getAccessToken() {
  const sql = getDb();
  const rows = await sql`SELECT access_token FROM marketplace_tokens WHERE provider = 'mercado_livre' LIMIT 1`;
  return rows[0]?.access_token as string | undefined;
}

export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get("value")?.trim() || "";
    const id = extractMercadoLivreId(value);
    if (!id) return NextResponse.json({ ok: false, error: "Cole um link do Mercado Livre ou um código MLB válido." }, { status: 400 });

    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ ok: false, error: "Mercado Livre não autorizado." }, { status: 401 });

    const isCatalogUrl = /mercadolivre\.com\.br\/[^?]*\/p\/MLB\d+/i.test(value);
    const endpoint = isCatalogUrl
      ? `https://api.mercadolibre.com/products/${id}`
      : `https://api.mercadolibre.com/items/${id}`;

    let response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    let data = await response.json();
    let type = isCatalogUrl ? "catalog_product" : "item";

    // Se o usuário colar apenas o código, tentamos item primeiro e catálogo depois.
    if (!response.ok && !isCatalogUrl && response.status === 404) {
      response = await fetch(`https://api.mercadolibre.com/products/${id}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      data = await response.json();
      type = "catalog_product";
    }

    if (!response.ok) return NextResponse.json({ ok: false, error: data?.message || data?.error || "Produto não encontrado." }, { status: response.status === 404 ? 404 : 502 });

    const pictures = Array.isArray(data.pictures)
      ? data.pictures.map((p: any) => p?.secure_url || p?.url || null).filter(Boolean)
      : [];

    return NextResponse.json({
      ok: true,
      type,
      product: {
        id: data.id || id,
        name: data.title || data.name || null,
        status: data.status || null,
        category_id: data.category_id || null,
        domain_id: data.domain_id || null,
        permalink: data.permalink || (value.startsWith("http") ? value : null),
        price: type === "item" ? data.price ?? null : null,
        original_price: type === "item" ? data.original_price ?? null : null,
        currency_id: data.currency_id || null,
        available_quantity: type === "item" ? data.available_quantity ?? null : null,
        pictures,
      },
      automation: {
        basic_data: true,
        images: pictures.length > 0,
        price: type === "item" && data.price != null,
        note: type === "catalog_product" ? "Produto de catálogo identificado. Preço exige um ITEM_ID de anúncio/oferta." : "Anúncio individual identificado.",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar prévia de importação", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao importar produto." }, { status: 500 });
  }
}
