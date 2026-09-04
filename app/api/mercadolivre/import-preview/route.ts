import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type Reference = {
  id: string;
  type: "item" | "catalog_product";
  source: "wid" | "path";
  catalogId: string | null;
};

type MercadoLivrePicture = { secure_url?: string; url?: string };
type MercadoLivrePrice = {
  type?: string;
  amount?: number;
  regular_amount?: number | null;
  currency_id?: string;
  conditions?: { context_restrictions?: string[] };
};
type MercadoLivreOffer = {
  item_id?: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  condition?: string;
};

function extractMercadoLivreReference(value: string): Reference | null {
  let catalogId: string | null = null;
  try {
    const url = new URL(value);
    catalogId = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1]?.toUpperCase() || null;
    const widQuery = url.searchParams.get("wid")?.toUpperCase();
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const widHash = hashParams.get("wid")?.toUpperCase();
    const wid = widQuery || widHash;
    if (wid && /^MLB\d+$/.test(wid)) return { id: wid, type: "item", source: "wid", catalogId };
  } catch {}

  const decoded = decodeURIComponent(value).toUpperCase();
  const widMatch = decoded.match(/(?:[?#&])WID=(MLB\d+)/)?.[1];
  const pathCatalogId = decoded.match(/\/P\/(MLB\d+)/)?.[1] || catalogId;
  if (widMatch) return { id: widMatch, type: "item", source: "wid", catalogId: pathCatalogId || null };
  const id = decoded.match(/MLB\d+/)?.[0] || null;
  if (!id) return null;
  const isCatalogUrl = /mercadolivre\.com\.br\/[^?#]*\/p\/MLB\d+/i.test(value);
  return { id, type: isCatalogUrl ? "catalog_product" : "item", source: "path", catalogId: isCatalogUrl ? id : pathCatalogId || null };
}

async function mlFetch(url: string) {
  let token = await getMercadoLivreAccessToken();
  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 401) {
    token = await getMercadoLivreAccessToken(true);
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  }
  return response;
}

async function getItemPrice(itemId: string, fallbackPrice: number | null) {
  const saleResponse = await mlFetch(`https://api.mercadolibre.com/items/${itemId}/sale_price?context=channel_marketplace`);
  if (saleResponse.ok) {
    const data = await saleResponse.json();
    if (typeof data?.amount === "number") {
      return {
        data: {
          price: data.amount,
          original_price: typeof data?.regular_amount === "number" ? data.regular_amount : null,
          currency_id: data?.currency_id || "BRL",
        },
        status: saleResponse.status,
      };
    }
  }

  const pricesResponse = await mlFetch(`https://api.mercadolibre.com/items/${itemId}/prices`);
  if (pricesResponse.ok) {
    const data = await pricesResponse.json();
    const prices: MercadoLivrePrice[] = Array.isArray(data?.prices) ? data.prices : [];
    const marketplace = prices.filter((price) => {
      const restrictions = Array.isArray(price?.conditions?.context_restrictions)
        ? price.conditions.context_restrictions
        : [];
      return restrictions.length === 0 || restrictions.includes("channel_marketplace");
    });
    const preferred =
      marketplace.find((price) => price.type === "promotion" && typeof price.amount === "number") ||
      marketplace.find((price) => price.type === "standard" && typeof price.amount === "number") ||
      marketplace.find((price) => typeof price.amount === "number");
    if (typeof preferred?.amount === "number") {
      return {
        data: {
          price: preferred.amount,
          original_price: typeof preferred.regular_amount === "number" ? preferred.regular_amount : null,
          currency_id: preferred.currency_id || data?.currency_id || "BRL",
        },
        status: pricesResponse.status,
      };
    }
  }

  return {
    data: fallbackPrice != null ? { price: fallbackPrice, original_price: null, currency_id: "BRL" } : null,
    status: pricesResponse.status || saleResponse.status,
  };
}

async function getCatalogOffer(catalogId: string, preferredItemId?: string | null) {
  try {
    const response = await mlFetch(`https://api.mercadolibre.com/products/${catalogId}/items`);
    if (!response.ok) return null;
    const data = await response.json();
    const offers: MercadoLivreOffer[] = Array.isArray(data?.results) ? data.results : [];
    const valid = offers.filter((offer) =>
      typeof offer.item_id === "string" && (!offer.condition || offer.condition === "new"),
    );
    const selected =
      valid.find((offer) => offer.item_id === preferredItemId) ||
      valid.filter((offer) => typeof offer.price === "number").sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] ||
      valid[0];
    if (!selected?.item_id) return null;
    return {
      itemId: selected.item_id,
      price: typeof selected.price === "number" ? selected.price : null,
      originalPrice: typeof selected.original_price === "number" ? selected.original_price : null,
      currencyId: selected.currency_id || "BRL",
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get("value")?.trim() || "";
    const reference = extractMercadoLivreReference(value);
    if (!reference) return NextResponse.json({ ok: false, error: "Cole um link do Mercado Livre ou um código MLB válido." }, { status: 400 });

    let requestedItemId = reference.type === "item" ? reference.id : null;
    let id = reference.id;
    let type = reference.type;
    let itemAccessStatus: number | null = null;
    let usedCatalogFallback = false;

    if (!requestedItemId && reference.catalogId) {
      const offer = await getCatalogOffer(reference.catalogId);
      if (offer) requestedItemId = offer.itemId;
    }

    let response = await mlFetch(type === "catalog_product" ? `https://api.mercadolibre.com/products/${id}` : `https://api.mercadolibre.com/items/${id}`);
    if (type === "item") itemAccessStatus = response.status;
    let data = await response.json();

    if (!response.ok && type === "item" && (response.status === 403 || response.status === 404) && reference.catalogId) {
      id = reference.catalogId;
      type = "catalog_product";
      response = await mlFetch(`https://api.mercadolibre.com/products/${id}`);
      data = await response.json();
      usedCatalogFallback = response.ok;
    } else if (!response.ok && type === "item" && response.status === 404 && reference.source !== "wid") {
      response = await mlFetch(`https://api.mercadolibre.com/products/${id}`);
      data = await response.json();
      type = "catalog_product";
    }

    if (!response.ok) return NextResponse.json({ ok: false, error: data?.message || data?.error || "Produto não encontrado." }, { status: response.status === 404 ? 404 : 502 });

    const catalogId = reference.catalogId || (type === "catalog_product" ? data.id || id : data.catalog_product_id || null);
    const catalogOffer = catalogId ? await getCatalogOffer(catalogId, requestedItemId) : null;
    if (!requestedItemId && catalogOffer?.itemId) requestedItemId = catalogOffer.itemId;

    const pictures = Array.isArray(data.pictures)
      ? (data.pictures as MercadoLivrePicture[]).map((picture) => picture?.secure_url || picture?.url || null).filter((picture): picture is string => Boolean(picture))
      : [];

    const fallbackPrice = catalogOffer?.price ?? null;
    const priceResult = requestedItemId ? await getItemPrice(requestedItemId, fallbackPrice) : { data: null, status: null };
    const salePrice = priceResult.data;
    const hasPrice = salePrice?.price != null;
    const note = hasPrice
      ? usedCatalogFallback
        ? "Nome e imagens vieram do catálogo e o preço foi preservado da oferta selecionada/confirmado pela API de preços."
        : "Oferta identificada e preço atual consultado automaticamente no Mercado Livre."
      : type === "catalog_product"
        ? "Produto de catálogo identificado, mas nenhuma oferta com preço disponível foi encontrada."
        : "Anúncio identificado, mas a API de preços não retornou um preço para este item.";

    return NextResponse.json({
      ok: true,
      type: requestedItemId ? "item" : type,
      product: {
        id: requestedItemId || data.id || id,
        catalog_product_id: catalogId,
        name: data.title || data.name || null,
        status: data.status || null,
        category_id: data.category_id || null,
        domain_id: data.domain_id || null,
        permalink: data.permalink || (value.startsWith("http") ? value.split("#")[0] : null),
        price: salePrice?.price ?? null,
        original_price: salePrice?.original_price ?? catalogOffer?.originalPrice ?? null,
        currency_id: salePrice?.currency_id || catalogOffer?.currencyId || data.currency_id || null,
        available_quantity: type === "item" ? data.available_quantity ?? null : null,
        pictures,
      },
      automation: {
        basic_data: true,
        images: pictures.length > 0,
        price: hasPrice,
        reference_source: reference.source,
        item_access_status: itemAccessStatus,
        price_access_status: priceResult.status,
        catalog_fallback: usedCatalogFallback,
        note,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar prévia de importação", error);
    const message = error instanceof Error ? error.message : "Erro interno ao importar produto.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
