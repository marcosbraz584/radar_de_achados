import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  console.log("Mercado Livre notification received", {
    topic: payload?.topic ?? null,
    resource: payload?.resource ?? null,
    application_id: payload?.application_id ?? null,
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "mercadolivre-notifications" });
}
