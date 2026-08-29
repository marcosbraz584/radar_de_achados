import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDb();
    const result = await sql`SELECT NOW() AS now`;

    return NextResponse.json({
      ok: true,
      database: "connected",
      checkedAt: result[0]?.now ?? null,
    });
  } catch (error) {
    console.error("Database health check failed", error);

    return NextResponse.json(
      { ok: false, database: "disconnected" },
      { status: 500 },
    );
  }
}
