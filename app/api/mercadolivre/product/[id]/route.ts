import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const productId = String(id || "").trim().toUpperCase();

    if (!/^MLB\d+$/.test(productId)) {
      return NextResponse.json({ ok: false, error: "Código de produto inválido." }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`SELECT access_token FROM marketplace_tokens WHERE provider = 'mercado_livre' LIMIT 1`;
    const accessToken = rows[0]?.access_token;
    if (!accessToken) return NextResponse.json({ ok: false, error: "Mercado Livre não autorizado." }, { status: 401 });

    const response = await fetch(`https://api.mercadolibre.com/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const product = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, apiStatus: response.status, error: product?.message || product?.error || "Não foi possível consultar o produto de catálogo." }, { status: response.status === 404 ? 404 : 502 });
    }

    return NextResponse.json({
      ok: true,
      type: "catalog_product",
      product: {
        id: product.id ?? productId,
        name: product.name ?? null,
        status: product.status ?? null,
        domain_id: product.domain_id ?? null,
        permalink: product.permalink ?? null,
        buy_box_winner: product.buy_box_winner ? {
          item_id: product.buy_box_winner.item_id ?? null,
          price: product.buy_box_winner.price ?? null,
          currency_id: product.buy_box_winner.currency_id ?? null,
          seller_id: product.buy_box_winner.seller_id ?? null,
        } : null,
        pictures: Array.isArray(product.pictures) ? product.pictures.map((picture: any) => ({ id: picture.id ?? null, url: picture.secure_url || picture.url || null })) : [],
        main_features: Array.isArray(product.main_features) ? product.main_features : [],
        attributes: Array.isArray(product.attributes) ? product.attributes.map((attribute: any) => ({ id: attribute.id ?? null, name: attribute.name ?? null, value_name: attribute.value_name ?? null })) : [],
      },
    });
  } catch (error) {
    console.error("Erro ao consultar produto de catálogo Mercado Livre", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao consultar produto de catálogo." }, { status: 500 });
  }
}
