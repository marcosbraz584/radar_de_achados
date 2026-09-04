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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Digite pelo menos 2 caracteres para pesquisar." },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({
      status: "active",
      site_id: "MLB",
      q,
      limit: "12",
    });

    const response = await mlFetch(
      `https://api.mercadolibre.com/products/search?${params.toString()}`,
    );
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.message || data?.error || "Não foi possível pesquisar produtos no Mercado Livre.",
        },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const rawResults: MercadoLivreProduct[] = Array.isArray(data?.results)
      ? data.results
      : [];

    const results = rawResults.map((product) => {
      const pictures = Array.isArray(product.pictures)
        ? product.pictures
            .map((picture) => picture?.secure_url || picture?.url || null)
            .filter(Boolean)
        : [];

      const features = Array.isArray(product.main_features)
        ? product.main_features
            .map((feature) => feature?.text || feature?.value_name || null)
            .filter(Boolean)
            .slice(0, 3)
        : [];

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
      };
    });

    return NextResponse.json({
      ok: true,
      query: q,
      total: data?.paging?.total ?? results.length,
      results,
    });
  } catch (error) {
    console.error("Erro ao pesquisar produtos do Mercado Livre", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao pesquisar produtos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
