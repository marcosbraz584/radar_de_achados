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

    // O buscador oficial de produtos aceita Product ID. Primeiro confirmamos o produto
    // e preservamos a resposta de forma reduzida, sem expor dados privados da conta.
    const productSearchUrl = new URL("https://api.mercadolibre.com/products/search");
    productSearchUrl.searchParams.set("status", "active");
    productSearchUrl.searchParams.set("site_id", "MLB");
    productSearchUrl.searchParams.set("q", productId);

    const searchResponse = await fetch(productSearchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      return NextResponse.json({ ok: false, stage: "product_search", apiStatus: searchResponse.status, error: searchData?.message || searchData?.error || "Falha ao pesquisar produto de catálogo." }, { status: 502 });
    }

    const matchedProduct = Array.isArray(searchData?.results)
      ? searchData.results.find((p: any) => String(p?.id || "").toUpperCase() === productId) || searchData.results[0]
      : null;

    // A API documentada relaciona item -> catalog_product_id, mas não documenta uma
    // busca pública inversa catalog_product_id -> todos os anúncios. Não inventamos
    // uma rota. Retornamos o diagnóstico para orientar a próxima estratégia segura.
    return NextResponse.json({
      ok: true,
      catalogProductId: productId,
      catalogProductFound: Boolean(matchedProduct),
      product: matchedProduct ? {
        id: matchedProduct.id ?? productId,
        name: matchedProduct.name ?? null,
        status: matchedProduct.status ?? null,
        domain_id: matchedProduct.domain_id ?? null,
        pictures: Array.isArray(matchedProduct.pictures) ? matchedProduct.pictures.slice(0, 5).map((p: any) => p?.secure_url || p?.url || null).filter(Boolean) : [],
      } : null,
      offerLookup: {
        available: false,
        reason: "A documentação oficial consultada não fornece uma busca pública inversa de catalog_product_id para anúncios de terceiros. Para consultar preço com segurança, precisamos primeiro obter um ITEM_ID real; então usamos /items/{ITEM_ID}/sale_price.",
      },
    });
  } catch (error) {
    console.error("Erro no diagnóstico de ofertas do catálogo", error);
    return NextResponse.json({ ok: false, error: "Erro interno no diagnóstico de ofertas." }, { status: 500 });
  }
}
