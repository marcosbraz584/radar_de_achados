import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type CatalogProduct = {
  id?: string;
  name?: string;
  domain_id?: string;
  status?: string;
};

type DomainSuggestion = {
  domain_id?: string;
  domain_name?: string;
  category_id?: string;
  category_name?: string;
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
  const params = new URLSearchParams({ q, limit: "3" });
  const response = await mlFetch(
    `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?${params.toString()}`,
  );
  const data = await response.json();
  return {
    ok: response.ok,
    suggestions: (Array.isArray(data) ? data : []) as DomainSuggestion[],
  };
}

async function searchCatalog(q: string, domainId?: string) {
  const params = new URLSearchParams({
    site_id: "MLB",
    status: "active",
    q,
    limit: "50",
  });

  if (domainId) params.set("domain_id", domainId);

  const response = await mlFetch(
    `https://api.mercadolibre.com/products/search?${params.toString()}`,
  );
  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    total: data?.paging?.total ?? 0,
    results: (Array.isArray(data?.results) ? data.results : []).map(
      (product: CatalogProduct) => ({
        id: product.id ?? null,
        name: product.name ?? null,
        domain_id: product.domain_id ?? null,
        status: product.status ?? null,
      }),
    ),
    error: response.ok ? null : data?.message || data?.error || "Erro na consulta",
  };
}

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Digite pelo menos 2 caracteres." },
        { status: 400 },
      );
    }

    // Experimento isolado. Usa o preditor oficial para descobrir o dominio
    // e compara a busca ampla com a busca restrita ao dominio previsto.
    const prediction = await predictDomain(q);
    const predicted = prediction.suggestions[0] ?? null;
    const predictedDomain = predicted?.domain_id || undefined;

    const [broad, predictedDomainSearch] = await Promise.all([
      searchCatalog(q),
      searchCatalog(q, predictedDomain),
    ]);

    return NextResponse.json({
      ok: broad.ok || predictedDomainSearch.ok,
      query: q,
      experiment: "official_predicted_domain_comparison",
      prediction: {
        domain_id: predicted?.domain_id ?? null,
        domain_name: predicted?.domain_name ?? null,
        category_id: predicted?.category_id ?? null,
        category_name: predicted?.category_name ?? null,
        suggestions: prediction.suggestions,
      },
      broad,
      predicted_domain: predictedDomainSearch,
    });
  } catch (error) {
    console.error("Erro no experimento de busca Mercado Livre", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 500 },
    );
  }
}
