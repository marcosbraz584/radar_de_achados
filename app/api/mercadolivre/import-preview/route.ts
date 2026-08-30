import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

function extractMercadoLivreReference(value:string){
  try {
    const url = new URL(value);
    const widQuery = url.searchParams.get("wid")?.toUpperCase();
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const widHash = hashParams.get("wid")?.toUpperCase();
    const wid = widQuery || widHash;
    if (wid && /^MLB\d+$/.test(wid)) return { id: wid, type: "item" as const, source: "wid" as const };
  } catch {}

  const decoded = decodeURIComponent(value).toUpperCase();
  const widMatch = decoded.match(/(?:[?#&])WID=(MLB\d+)/)?.[1];
  if (widMatch) return { id: widMatch, type: "item" as const, source: "wid" as const };
  const id = decoded.match(/MLB\d+/)?.[0] || null;
  if (!id) return null;
  const isCatalogUrl = /mercadolivre\.com\.br\/[^?]*\/p\/MLB\d+/i.test(value);
  return { id, type: isCatalogUrl ? "catalog_product" as const : "item" as const, source: "path" as const };
}

async function mlFetch(url:string){let token=await getMercadoLivreAccessToken();let response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});if(response.status===401){token=await getMercadoLivreAccessToken(true);response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});}return response;}
async function getSalePrice(itemId:string){const response=await mlFetch(`https://api.mercadolibre.com/items/${itemId}/sale_price?context=channel_marketplace`);if(!response.ok)return null;const data=await response.json();return {price:typeof data?.amount==="number"?data.amount:null,original_price:typeof data?.regular_amount==="number"?data.regular_amount:null,currency_id:data?.currency_id||null};}

export async function GET(request:Request){try{const value=new URL(request.url).searchParams.get("value")?.trim()||"";const reference=extractMercadoLivreReference(value);if(!reference)return NextResponse.json({ok:false,error:"Cole um link do Mercado Livre ou um código MLB válido."},{status:400});const id=reference.id;let type=reference.type;let response=await mlFetch(type==="catalog_product"?`https://api.mercadolibre.com/products/${id}`:`https://api.mercadolibre.com/items/${id}`);let data=await response.json();if(!response.ok&&type==="item"&&response.status===404&&reference.source!=="wid"){response=await mlFetch(`https://api.mercadolibre.com/products/${id}`);data=await response.json();type="catalog_product";}if(!response.ok)return NextResponse.json({ok:false,error:data?.message||data?.error||"Produto não encontrado."},{status:response.status===404?404:502});const pictures=Array.isArray(data.pictures)?data.pictures.map((p:any)=>p?.secure_url||p?.url||null).filter(Boolean):[];const salePrice=type==="item"?await getSalePrice(id):null;return NextResponse.json({ok:true,type,product:{id:data.id||id,name:data.title||data.name||null,status:data.status||null,category_id:data.category_id||null,domain_id:data.domain_id||null,permalink:data.permalink||(value.startsWith("http")?value:null),price:salePrice?.price??null,original_price:salePrice?.original_price??null,currency_id:salePrice?.currency_id||data.currency_id||null,available_quantity:type==="item"?data.available_quantity??null:null,pictures},automation:{basic_data:true,images:pictures.length>0,price:salePrice?.price!=null,reference_source:reference.source,note:type==="catalog_product"?"Produto de catálogo identificado. Para preço automático precisamos do ITEM_ID da oferta/anúncio.":salePrice?.price!=null?"Preço atual consultado automaticamente pela API oficial de preços do Mercado Livre.":"Anúncio identificado, mas a API de preços não retornou um preço para este item."}});}catch(error){console.error("Erro ao gerar prévia de importação",error);const message=error instanceof Error?error.message:"Erro interno ao importar produto.";return NextResponse.json({ok:false,error:message},{status:500});}}
