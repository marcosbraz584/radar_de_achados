import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type CatalogProduct = {
  id?: string;
  name?: string;
  domain_id?: string;
  status?: string;
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

async function searchCatalog(q: string, listingStrategy?: string) {
  const params = new URLSearchParams({
    site_id: "MLB",
    status: "active",
    q,
    limit: "50",
  });

  if (listingStrategy) params.set("listing_strategy", listingStrategy);

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

    // Experimento isolado: não altera o importador atual.
    // Compara a busca ampla oficial com catalog_required, conforme documentação ML.
    const [broad, catalogRequired] = await Promise.all([
      searchCatalog(q),
      searchCatalog(q, "catalog_required"),
    ]);

    return NextResponse.json({
      ok: broad.ok || catalogRequired.ok,
      query: q,
      experiment: "official_catalog_comparison",
      broad,
      catalog_required: catalogRequired,
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
