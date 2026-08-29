import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const REDIRECT_URI = "https://radar-de-achados-2.vercel.app/api/mercadolivre/callback";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieHeader = request.headers.get("cookie") || "";
  const savedState = cookieHeader.match(/(?:^|;\s*)ml_oauth_state=([^;]+)/)?.[1];

  if (error) {
    return NextResponse.redirect(new URL(`/admin?ml=error&reason=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.json({ ok: false, error: "Retorno OAuth inválido ou expirado." }, { status: 400 });
  }

  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: "Credenciais do Mercado Livre não configuradas." }, { status: 500 });
  }

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }),
    cache: "no-store",
  });

  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) {
    console.error("Falha OAuth Mercado Livre", { status: tokenResponse.status, error: token.error, message: token.message });
    return NextResponse.redirect(new URL("/admin?ml=token_error", url.origin));
  }

  const sql = getDb();
  await sql`
    INSERT INTO marketplace_tokens (provider, user_id, access_token, refresh_token, expires_at, updated_at)
    VALUES (
      'mercado_livre',
      ${String(token.user_id || "")},
      ${String(token.access_token)},
      ${token.refresh_token ? String(token.refresh_token) : null},
      NOW() + (${Number(token.expires_in || 21600)} * INTERVAL '1 second'),
      NOW()
    )
    ON CONFLICT (provider)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;

  const response = NextResponse.redirect(new URL("/admin?ml=connected", url.origin));
  response.cookies.set("ml_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
