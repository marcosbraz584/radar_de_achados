import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";

const SESSION_COOKIE = "shilmastore_session";
const SESSION_DAYS = 30;

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: "customer" | "seller" | "admin";
  active: boolean;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const sql = getDb();

  await sql`INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash}, ${expiresAt})`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const sql = getDb();
    await sql`UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = ${sha256(token)} AND revoked_at IS NULL`;
  }
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = getDb();
  const rows = await sql`
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.active
    FROM auth_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(token)}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND u.active = TRUE
    LIMIT 1
  `;

  if (!rows.length) return null;

  await sql`UPDATE auth_sessions SET last_seen_at = NOW() WHERE token_hash = ${sha256(token)}`;
  return rows[0] as AuthUser;
}
