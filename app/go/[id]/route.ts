import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id:raw}=await params;
  const productId=Number(raw);
  if(!Number.isInteger(productId)||productId<=0){
    return NextResponse.redirect(new URL("/",request.url));
  }

  const sql=getDb();
  const rows=await sql`SELECT id,slug,COALESCE(destination_url,affiliate_url) AS destination_url,active FROM products WHERE id=${productId} LIMIT 1`;
  const product:any=rows[0];
  if(!product||!product.active){
    return NextResponse.redirect(new URL("/",request.url));
  }

  const source=(request.nextUrl.searchParams.get("source")||"site").slice(0,80);

  // Os cards da vitrine abrem primeiro a página interna do produto.
  // O clique de saída para o parceiro é registrado somente no botão "Ver oferta".
  if(source==="site"&&product.slug){
    return NextResponse.redirect(new URL(`/produto/${encodeURIComponent(product.slug)}`,request.url),302);
  }

  if(!product.destination_url){
    return NextResponse.redirect(new URL(`/produto/${encodeURIComponent(product.slug||String(productId))}`,request.url),302);
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
