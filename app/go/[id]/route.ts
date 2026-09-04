import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function publicOrigin(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host && host !== "0.0.0.0:3000" && !host.startsWith("0.0.0.0:")) {
    return `${proto}://${host}`;
  }
  return "https://purple-alpaca-620001.hostingersite.com";
}

function internalUrl(request: NextRequest, path: string) {
  return new URL(path, publicOrigin(request));
}

export async function GET(request: NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id:raw}=await params;
  const productId=Number(raw);
  if(!Number.isInteger(productId)||productId<=0){
    return NextResponse.redirect(internalUrl(request,"/"));
  }

  const sql=getDb();
  const rows=await sql`SELECT id,slug,COALESCE(destination_url,affiliate_url) AS destination_url,active FROM products WHERE id=${productId} LIMIT 1`;
  const product:any=rows[0];
  if(!product||!product.active){
    return NextResponse.redirect(internalUrl(request,"/"));
  }

  const source=(request.nextUrl.searchParams.get("source")||"site").slice(0,80);

  // Os cards da vitrine abrem primeiro a página interna do produto.
  // O clique de saída para o parceiro é registrado somente no botão "Ver oferta".
  if(source==="site"&&product.slug){
    return NextResponse.redirect(internalUrl(request,`/produto/${encodeURIComponent(product.slug)}`),302);
  }

  if(!product.destination_url){
    return NextResponse.redirect(internalUrl(request,`/produto/${encodeURIComponent(product.slug||String(productId))}`),302);
  }

  const referrer=(request.headers.get("referer")||"").slice(0,2000)||null;
  const userAgent=(request.headers.get("user-agent")||"").slice(0,2000)||null;

  try{
    await sql`INSERT INTO clicks(product_id,destination_url,source,referrer,user_agent,clicked_at) VALUES (${productId},${product.destination_url},${source},${referrer},${userAgent},NOW())`;
  }catch(error){
    console.error("Falha ao registrar clique",error);
  }

  return NextResponse.redirect(product.destination_url,302);
}
