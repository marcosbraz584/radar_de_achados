import { getDb } from "@/lib/db";

type TokenRow = { access_token?: string; refresh_token?: string; expires_at?: string | Date };

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciais do Mercado Livre não configuradas.");

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error(token?.message || token?.error || "Não foi possível renovar a autorização do Mercado Livre.");

  const sql = getDb();
  await sql`UPDATE marketplace_tokens SET access_token=${String(token.access_token)}, refresh_token=${token.refresh_token ? String(token.refresh_token) : refreshToken}, expires_at=NOW()+(${Number(token.expires_in || 21600)} * INTERVAL '1 second'), updated_at=NOW() WHERE provider='mercado_livre'`;
  return String(token.access_token);
}

export async function getMercadoLivreAccessToken(forceRefresh = false) {
  const sql = getDb();
  const rows = await sql`SELECT access_token, refresh_token, expires_at FROM marketplace_tokens WHERE provider='mercado_livre' LIMIT 1`;
  const row = rows[0] as TokenRow | undefined;
  if (!row?.access_token) throw new Error("Mercado Livre não autorizado.");

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const shouldRefresh = forceRefresh || !expiresAt || expiresAt <= Date.now() + 60_000;
  if (!shouldRefresh) return row.access_token;
  if (!row.refresh_token) throw new Error("Autorização expirada. Conecte novamente o Mercado Livre.");

  if (!refreshInFlight) refreshInFlight = refreshAccessToken(row.refresh_token).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
