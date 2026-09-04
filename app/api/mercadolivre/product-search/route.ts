import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type MercadoLivreProduct = {
  id?: string;
  name?: string;
  status?: string;
  domain_id?: string;
  pictures?: Array<{ id?: string; url?: string; secure_url?: string }>;
  main_features?: Array<{ text?: string; value_name?: string }>;
};

type MercadoLivreOffer = {
  item_id?: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  condition?: string;
};

type DomainSuggestion = {
  domain_id?: string;
  domain_name?: string;
  category_id?: string;
  category_name?: string;
};

type SearchRow = {
  id: string | null;
  name: string | null;
  status: string | null;
  domain_id: string | null;
  image: string | null;
  pictures: string[];
  features: string[];
  permalink: string | null;
  offer_item_id: string | null;
  offer_price: number | null;
  offer_original_price: number | null;
  currency_id: string | null;
  offers_count: number;
  search_position: number;
  relevance: number;
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

async function predictDomain(q: string) {
  try {
    const params = new URLSearchParams({ q, limit: "1" });
    const response = await mlFetch(
      `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?${params.toString()}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const suggestions: DomainSuggestion[] = Array.isArray(data) ? data : [];
    return suggestions[0] || null;
  } catch {
    return null;
  }
}

async function searchCatalog(q: string, domainId: string | null, offset: number, limit = 30) {
  const params = new URLSearchParams({
    status: "active",
    site_id: "MLB",
    q,
    limit: String(limit),
    offset: String(offset),
  });
  if (domainId) params.set("domain_id", domainId);

  const response = await mlFetch(
    `https://api.mercadolibre.com/products/search?${params.toString()}`,
  );
  const data = await response.json();
  return { response, data };
}

async function getBestCatalogOffer(productId: string) {
  try {
    const response = await mlFetch(
      `https://api.mercadolibre.com/products/${encodeURIComponent(productId)}/items`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    const offers: MercadoLivreOffer[] = Array.isArray(data?.results) ? data.results : [];
    const valid = offers
      .filter(
        (offer) =>
          typeof offer.item_id === "string" &&
          (!offer.condition || offer.condition === "new") &&
          typeof offer.price === "number",
      )
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

    const best = valid[0];
    if (!best?.item_id || typeof best.price !== "number") return null;

    return {
      item_id: best.item_id,
      price: best.price,
      original_price:
        typeof best.original_price === "number" ? best.original_price : null,
      currency_id: best.currency_id || "BRL",
      offers_count: offers.length,
    };
  } catch {
    return null;
  }
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function relevanceScore(name: string, q: string) {
  const title = normalize(name);
  const query = normalize(q);
  const words = query.split(/\s+/).filter((word) => word.length > 1);
  let score = 0;

  if (title === query) score += 100;
  if (title.startsWith(query)) score += 50;
  if (title.includes(query)) score += 35;

  for (const word of words) {
    if (title.includes(word)) score += 12;
    if (title.startsWith(word)) score += 6;
  }

  return score;
}

async function enrichProducts(
  products: MercadoLivreProduct[],
  q: string,
  basePosition: number,
): Promise<SearchRow[]> {
  return Promise.all(
    products.map(async (product, index) => {
      const pictures = Array.isArray(product.pictures)
        ? product.pictures
            .map((picture) => picture?.secure_url || picture?.url || null)
            .filter((value): value is string => Boolean(value))
        : [];

      const features = Array.isArray(product.main_features)
        ? product.main_features
            .map((feature) => feature?.text || feature?.value_name || null)
            .filter((value): value is string => Boolean(value))
            .slice(0, 3)
        : [];

      const offer = product.id ? await getBestCatalogOffer(product.id) : null;

      return {
        id: product.id || null,
        name: product.name || null,
        status: product.status || null,
        domain_id: product.domain_id || null,
        image: pictures[0] || null,
        pictures,
        features,
        permalink: product.id
          ? `https://www.mercadolivre.com.br/p/${product.id}`
          : null,
        offer_item_id: offer?.item_id || null,
        offer_price: offer?.price ?? null,
        offer_original_price: offer?.original_price ?? null,
        currency_id: offer?.currency_id || null,
        offers_count: offer?.offers_count ?? 0,
        search_position: basePosition + index,
        relevance: relevanceScore(product.name || "", q),
      };
    }),
  );
}

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Digite pelo menos 2 caracteres para pesquisar." },
        { status: 400 },
      );
    }

    const predicted = await predictDomain(q);
    const domainId = predicted?.domain_id || null;

    let collected: SearchRow[] = [];
    let total = 0;
    let scannedCatalogs = 0;

    // Varremos até 3 páginas do catálogo, mas paramos assim que já temos
    // opções compráveis suficientes para preencher a tela.
    for (const offset of [0, 30, 60]) {
      let { response, data } = await searchCatalog(q, domainId, offset, 30);

      // Se o domínio previsto não trouxer nada na primeira página, fazemos
      // a busca genérica para não perder produtos válidos.
      if (
        offset === 0 &&
        domainId &&
        response.ok &&
        (!Array.isArray(data?.results) || data.results.length === 0)
      ) {
        ({ response, data } = await searchCatalog(q, null, 0, 30));
      }

      if (!response.ok) {
        if (offset === 0) {
          return NextResponse.json(
            {
              ok: false,
              error:
                data?.message ||
                data?.error ||
                "Não foi possível pesquisar produtos no Mercado Livre.",
            },
            { status: response.status === 404 ? 404 : 502 },
          );
        }
        break;
      }

      const page: MercadoLivreProduct[] = Array.isArray(data?.results)
        ? data.results
        : [];
      if (offset === 0) total = data?.paging?.total ?? page.length;
      if (!page.length) break;

      scannedCatalogs += page.length;
      const enriched = await enrichProducts(page, q, offset);
      collected = collected.concat(enriched);

      const pricedCount = collected.filter(
        (product) => product.offer_item_id && product.offer_price != null,
      ).length;
      if (pricedCount >= 12) break;
    }

    const priced = collected
      .filter((product) => product.offer_item_id && product.offer_price != null)
      .sort(
        (a, b) =>
          b.relevance - a.relevance || a.search_position - b.search_position,
      );

    const withoutPrice = collected
      .filter((product) => !(product.offer_item_id && product.offer_price != null))
      .sort(
        (a, b) =>
          b.relevance - a.relevance || a.search_position - b.search_position,
      );

    // Mostramos primeiro tudo que é realmente comprável. Só completamos a
    // grade com catálogos sem preço quando não houver 12 opções compráveis.
    const results = [...priced, ...withoutPrice].slice(0, 12);

    return NextResponse.json({
      ok: true,
      query: q,
      predicted_domain: predicted?.domain_id || null,
      predicted_domain_name: predicted?.domain_name || null,
      predicted_category: predicted?.category_id || null,
      predicted_category_name: predicted?.category_name || null,
      total,
      scanned_catalogs: scannedCatalogs,
      priced_results: priced.length,
      results,
    });
  } catch (error) {
    console.error("Erro ao pesquisar produtos do Mercado Livre", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao pesquisar produtos.",
      },
      { status: 500 },
    );
  }
}
