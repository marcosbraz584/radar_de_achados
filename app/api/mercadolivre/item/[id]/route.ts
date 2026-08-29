import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const itemId = String(id || "").trim().toUpperCase();

    if (!/^MLB\d+$/.test(itemId)) {
      return NextResponse.json({ ok: false, error: "Código inválido. Use um código como MLB1234567890." }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`SELECT access_token FROM marketplace_tokens WHERE provider = 'mercado_livre' LIMIT 1`;
    const accessToken = rows[0]?.access_token;
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Mercado Livre não autorizado." }, { status: 401 });
    }

    const response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const item = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, apiStatus: response.status, error: item?.message || item?.error || "Não foi possível consultar o produto." }, { status: response.status === 404 ? 404 : 502 });
    }

    return NextResponse.json({
      ok: true,
      product: {
        id: item.id ?? itemId,
        title: item.title ?? null,
        category_id: item.category_id ?? null,
        price: item.price ?? null,
        base_price: item.base_price ?? null,
        original_price: item.original_price ?? null,
        currency_id: item.currency_id ?? null,
        available_quantity: item.available_quantity ?? null,
        status: item.status ?? null,
        permalink: item.permalink ?? null,
        thumbnail: item.thumbnail ?? null,
        pictures: Array.isArray(item.pictures) ? item.pictures.map((picture: any) => ({ id: picture.id ?? null, url: picture.secure_url || picture.url || null })) : [],
      },
    });
  } catch (error) {
    console.error("Erro ao consultar item Mercado Livre", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao consultar produto." }, { status: 500 });
  }
}
