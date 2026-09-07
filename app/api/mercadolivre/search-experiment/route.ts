import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type DomainSuggestion = {
  domain_id?: string;
  domain_name?: string;
  category_id?: string;
  category_name?: string;
};

type MarketplaceItem = {
  id?: string;
  title?: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  category_id?: string;
  catalog_product_id?: string | null;
  permalink?: string;
  thumbnail?: string;
};

async function mlFetch(url: string) {
  let token = await getMercadoLivreAccessToken();
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    token = await getMercadoLivreAccessToken(true);
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }
  return response;
}

async function predict(q: string) {
  const params = new URLSearchParams({ q, limit: "3" });
  const response = await mlFetch(`https://api.mercadolibre.com/sites/MLB/domain_discovery/search?${params}`);
  const data = await response.json();
  return (Array.isArray(data) ? data : []) as DomainSuggestion[];
}

async function searchMarketplace(q: string, categoryId: string) {
  const params = new URLSearchParams({ q, category: categoryId, limit: "50" });
  const response = await mlFetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`);
  const data = await response.json();
  const results: MarketplaceItem[] = Array.isArray(data?.results) ? data.results : [];
  return {
    ok: response.ok,
    status: response.status,
    total: data?.paging?.total ?? results.length,
    error: response.ok ? null : data?.message || data?.error || "Erro na consulta",
    results: results.slice(0, 24).map((item) => ({
      item_id: item.id ?? null,
      catalog_product_id: item.catalog_product_id ?? null,
      name: item.title ?? null,
      price: typeof item.price === "number" ? item.price : null,
      original_price: typeof item.original_price === "number" ? item.original_price : null,
      currency_id: item.currency_id ?? null,
      category_id: item.category_id ?? null,
      permalink: item.permalink ?? null,
      image: item.thumbnail ?? null,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json({ ok: false, error: "Digite pelo menos 2 caracteres." }, { status: 400 });

    const suggestions = await predict(q);
    const predicted = suggestions[0] ?? null;
    const categoryId = predicted?.category_id;
    if (!categoryId) return NextResponse.json({ ok: false, query: q, error: "Categoria não prevista pelo Mercado Livre.", suggestions });

    const marketplace = await searchMarketplace(q, categoryId);
    return NextResponse.json({
      ok: marketplace.ok,
      query: q,
      experiment: "marketplace_search_by_predicted_category",
      prediction: {
        domain_id: predicted?.domain_id ?? null,
        domain_name: predicted?.domain_name ?? null,
        category_id: categoryId,
        category_name: predicted?.category_name ?? null,
      },
      marketplace,
    });
  } catch (error) {
    console.error("Erro no experimento de busca Mercado Livre", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro interno." }, { status: 500 });
  }
}
