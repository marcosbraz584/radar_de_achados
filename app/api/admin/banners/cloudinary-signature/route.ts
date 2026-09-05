import { NextResponse } from "next/server";
import { createBannerUploadSignature } from "@/lib/banner-storage";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(createBannerUploadSignature());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível preparar o upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
