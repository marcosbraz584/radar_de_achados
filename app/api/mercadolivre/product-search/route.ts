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
type MercadoLivreOffer = { item_id?: string; price?: number; original_price?: number | null; currency_id?: string; condition?: string };
type MercadoLivrePrice = { type?: string; amount?: number; regular_amount?: number | null; currency_id?: string; conditions?: { context_restrictions?: string[] } };
type DomainSuggestion = { domain_id?: string; domain_name?: string; category_id?: string; category_name?: string };
type MarketplaceItem = {
  id?: string;
  title?: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  condition?: string;
  permalink?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  catalog_product_id?: string | null;
  category_id?: string;
};

async function mlFetch(url: string) {
  let token = await getMercadoLivreAccessToken();
  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 401) {
    token = await getMercadoLivreAccessToken(true);
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  }
  return response;
}

async function predictDomain(q: string) {
  try {
    const params = new URLSearchParams({ q, limit: "1" });
    const response = await mlFetch(`https://api.mercadolibre.com/sites/MLB/domain_discovery/search?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    const suggestions: DomainSuggestion[] = Array.isArray(data) ? data : [];
    return suggestions[0] || null;
  } catch { return null; }
}

async function getCurrentItemPrice(itemId: string, fallbackPrice: number | null) {
  try {
    const response = await mlFetch(`https://api.mercadolibre.com/items/${itemId}/prices`);
    if (!response.ok) return { price: fallbackPrice, original_price: null, currency_id: "BRL" };
    const data = await response.json();
    const prices: MercadoLivrePrice[] = Array.isArray(data?.prices) ? data.prices : [];
    const marketplacePrices = prices.filter((price) => {
      const restrictions = Array.isArray(price?.conditions?.context_restrictions) ? price.conditions.context_restrictions : [];
      return restrictions.length === 0 || restrictions.includes("channel_marketplace");
    });
    const preferred = marketplacePrices.find((price) => price?.type === "promotion" && typeof price?.amount === "number") || marketplacePrices.find((price) => price?.type === "standard" && typeof price?.amount === "number") || marketplacePrices.find((price) => typeof price?.amount === "number");
    return { price: typeof preferred?.amount === "number" ? preferred.amount : fallbackPrice, original_price: typeof preferred?.regular_amount === "number" ? preferred.regular_amount : null, currency_id: preferred?.currency_id || data?.currency_id || "BRL" };
  } catch { return { price: fallbackPrice, original_price: null, currency_id: "BRL" }; }
}

async function getBestOffer(productId: string) {
  try {
    const response = await mlFetch(`https://api.mercadolibre.com/products/${productId}/items`);
    if (!response.ok) return null;
    const data = await response.json();
    const offers: MercadoLivreOffer[] = Array.isArray(data?.results) ? data.results : [];
    const valid = offers.filter((offer) => typeof offer?.item_id === "string" && (!offer.condition || offer.condition === "new")).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    const best = valid.find((offer) => typeof offer.price === "number") || valid[0];
    if (!best?.item_id) return null;
    const officialPrice = await getCurrentItemPrice(best.item_id, typeof best.price === "number" ? best.price : null);
    return { item_id: best.item_id, price: officialPrice.price, original_price: officialPrice.original_price ?? (typeof best.original_price === "number" ? best.original_price : null), currency_id: officialPrice.currency_id || best.currency_id || "BRL", offers_count: offers.length };
  } catch { return null; }
}

async function searchCatalog(q: string, domainId?: string | null) {
  const params = new URLSearchParams({ status: "active", site_id: "MLB", q, limit: "30" });
  if (domainId) params.set("domain_id", domainId);
  const response = await mlFetch(`https://api.mercadolibre.com/products/search?${params.toString()}`);
  return { response, data: await response.json() };
}

async function searchMarketplaceItems(q: string) {
  try {
    const params = new URLSearchParams({ q, limit: "30" });
    const response = await mlFetch(`https://api.mercadolibre.com/sites/MLB/search?${params.toString()}`);
    if (!response.ok) return [] as MarketplaceItem[];
    const data = await response.json();
    return (Array.isArray(data?.results) ? data.results : []) as MarketplaceItem[];
  } catch { return [] as MarketplaceItem[]; }
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
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

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json({ ok: false, error: "Digite pelo menos 2 caracteres para pesquisar." }, { status: 400 });

    const predicted = await predictDomain(q);
    let { response, data } = await searchCatalog(q, predicted?.domain_id || null);
    if (response.ok && (!Array.isArray(data?.results) || data.results.length === 0) && predicted?.domain_id) ({ response, data } = await searchCatalog(q));
    if (!response.ok) return NextResponse.json({ ok: false, error: data?.message || data?.error || "Não foi possível pesquisar produtos no Mercado Livre." }, { status: response.status === 404 ? 404 : 502 });

    const rawResults: MercadoLivreProduct[] = Array.isArray(data?.results) ? data.results : [];
    const rankedRaw = rawResults
      .map((product, original_position) => ({ product, original_position, relevance: relevanceScore(product.name || "", q) }))
      .sort((a, b) => b.relevance - a.relevance || a.original_position - b.original_position)
      .slice(0, 24);

    const catalogResults = await Promise.all(rankedRaw.map(async ({ product, original_position, relevance }) => {
      const pictures = Array.isArray(product.pictures) ? product.pictures.map((picture) => picture?.secure_url || picture?.url || null).filter((value): value is string => Boolean(value)) : [];
      const features = Array.isArray(product.main_features) ? product.main_features.map((feature) => feature?.text || feature?.value_name || null).filter((value): value is string => Boolean(value)).slice(0, 3) : [];
      const offer = product.id ? await getBestOffer(product.id) : null;
      return { id: product.id || null, name: product.name || null, status: product.status || null, domain_id: product.domain_id || null, image: pictures[0] || null, pictures, features, permalink: product.id ? `https://www.mercadolivre.com.br/p/${product.id}` : null, offer_item_id: offer?.item_id || null, offer_price: offer?.price ?? null, offer_original_price: offer?.original_price ?? null, currency_id: offer?.currency_id || null, offers_count: offer?.offers_count ?? 0, search_position: original_position, relevance };
    }));

    let combined = [...catalogResults];
    const pricedCatalog = catalogResults.filter((product) => product.offer_item_id && product.offer_price != null).length;

    if (pricedCatalog < 8) {
      const marketplaceItems = (await searchMarketplaceItems(q)).filter((item) => item.id && item.title && (!item.condition || item.condition === "new")).slice(0, 20);
      const directResults = await Promise.all(marketplaceItems.map(async (item, index) => {
        const checkedPrice = await getCurrentItemPrice(String(item.id), typeof item.price === "number" ? item.price : null);
        const catalogId = item.catalog_product_id || null;
        const image = item.secure_thumbnail || item.thumbnail || null;
        return {
          id: catalogId || item.id || null,
          name: item.title || null,
          status: "active",
          domain_id: predicted?.domain_id || null,
          image,
          pictures: image ? [image] : [],
          features: [] as string[],
          permalink: catalogId ? `https://www.mercadolivre.com.br/p/${catalogId}` : item.permalink || null,
          offer_item_id: item.id || null,
          offer_price: checkedPrice.price,
          offer_original_price: checkedPrice.original_price ?? (typeof item.original_price === "number" ? item.original_price : null),
          currency_id: checkedPrice.currency_id || item.currency_id || "BRL",
          offers_count: 1,
          search_position: 1000 + index,
          relevance: relevanceScore(item.title || "", q),
        };
      }));

      const seenOffers = new Set(combined.map((product) => product.offer_item_id).filter(Boolean));
      for (const product of directResults) {
        if (product.offer_item_id && !seenOffers.has(product.offer_item_id)) {
          combined.push(product);
          seenOffers.add(product.offer_item_id);
        }
      }
    }

    const results = combined.sort((a, b) => {
      const aHasPrice = a.offer_item_id && a.offer_price != null ? 1 : 0;
      const bHasPrice = b.offer_item_id && b.offer_price != null ? 1 : 0;
      if (aHasPrice !== bHasPrice) return bHasPrice - aHasPrice;
      if (a.relevance !== b.relevance) return b.relevance - a.relevance;
      return a.search_position - b.search_position;
    }).slice(0, 12);

    return NextResponse.json({ ok: true, query: q, predicted_domain: predicted?.domain_id || null, predicted_domain_name: predicted?.domain_name || null, predicted_category: predicted?.category_id || null, predicted_category_name: predicted?.category_name || null, total: data?.paging?.total ?? results.length, priced_results: results.filter((product) => product.offer_item_id && product.offer_price != null).length, results });
  } catch (error) {
    console.error("Erro ao pesquisar produtos do Mercado Livre", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro interno ao pesquisar produtos." }, { status: 500 });
  }
}
