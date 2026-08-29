import { NextResponse } from "next/server";
import crypto from "node:crypto";

const REDIRECT_URI = "https://radar-de-achados-2.vercel.app/api/mercadolivre/callback";

export async function GET(request: Request) {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ ok: false, error: "MERCADO_LIVRE_CLIENT_ID não configurado." }, { status: 500 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = new URL("https://auth.mercadolivre.com.br/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
