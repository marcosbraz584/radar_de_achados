import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT access_token, expires_at
      FROM marketplace_tokens
      WHERE provider = 'mercado_livre'
      LIMIT 1
    `;

    const integration = rows[0];
    if (!integration?.access_token) {
      return NextResponse.json({ ok: false, connected: false, error: "Mercado Livre ainda não autorizado." }, { status: 401 });
    }

    const response = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${integration.access_token}` },
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        connected: true,
        apiStatus: response.status,
        error: data?.message || data?.error || "Falha ao consultar a API do Mercado Livre.",
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      mercadoLivre: {
        id: data.id ?? null,
        nickname: data.nickname ?? null,
        site_id: data.site_id ?? null,
        country_id: data.country_id ?? null,
      },
    });
  } catch (error) {
    console.error("Erro no teste Mercado Livre", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao testar integração." }, { status: 500 });
  }
}
