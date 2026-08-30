import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken } from "@/lib/mercadolivre";

export const dynamic = "force-dynamic";

type Reference = {
  id: string;
  type: "item" | "catalog_product";
  source: "wid" | "path";
  catalogId: string | null;
};

function extractMercadoLivreReference(value:string): Reference | null {
  let catalogId:string|null=null;
  try {
    const url = new URL(value);
    catalogId = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1]?.toUpperCase() || null;
    const widQuery = url.searchParams.get("wid")?.toUpperCase();
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const widHash = hashParams.get("wid")?.toUpperCase();
    const wid = widQuery || widHash;
    if (wid && /^MLB\d+$/.test(wid)) return { id: wid, type: "item", source: "wid", catalogId };
  } catch {}

  const decoded = decodeURIComponent(value).toUpperCase();
  const widMatch = decoded.match(/(?:[?#&])WID=(MLB\d+)/)?.[1];
  const pathCatalogId = decoded.match(/\/P\/(MLB\d+)/)?.[1] || catalogId;
  if (widMatch) return { id: widMatch, type: "item", source: "wid", catalogId: pathCatalogId || null };
  const id = decoded.match(/MLB\d+/)?.[0] || null;
  if (!id) return null;
  const isCatalogUrl = /mercadolivre\.com\.br\/[^?#]*\/p\/MLB\d+/i.test(value);
  return { id, type: isCatalogUrl ? "catalog_product" : "item", source: "path", catalogId: isCatalogUrl ? id : pathCatalogId || null };
}

async function mlFetch(url:string){
  let token=await getMercadoLivreAccessToken();
  let response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(response.status===401){
    token=await getMercadoLivreAccessToken(true);
    response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  }
  return response;
}

async function getSalePrice(itemId:string){
  const response=await mlFetch(`https://api.mercadolibre.com/items/${itemId}/sale_price?context=channel_marketplace`);
  if(!response.ok)return { data:null, status:response.status };
  const data=await response.json();
  return { data:{price:typeof data?.amount==="number"?data.amount:null,original_price:typeof data?.regular_amount==="number"?data.regular_amount:null,currency_id:data?.currency_id||null}, status:response.status };
}

export async function GET(request:Request){
  try{
    const value=new URL(request.url).searchParams.get("value")?.trim()||"";
    const reference=extractMercadoLivreReference(value);
    if(!reference)return NextResponse.json({ok:false,error:"Cole um link do Mercado Livre ou um código MLB válido."},{status:400});

    const requestedItemId=reference.type==="item"?reference.id:null;
    let id=reference.id;
    let type=reference.type;
    let itemAccessStatus:number|null=null;
    let usedCatalogFallback=false;

    let response=await mlFetch(type==="catalog_product"?`https://api.mercadolibre.com/products/${id}`:`https://api.mercadolibre.com/items/${id}`);
    if(type==="item") itemAccessStatus=response.status;
    let data=await response.json();

    if(!response.ok&&type==="item"&&(response.status===403||response.status===404)&&reference.catalogId){
      id=reference.catalogId;
      type="catalog_product";
      response=await mlFetch(`https://api.mercadolibre.com/products/${id}`);
      data=await response.json();
      usedCatalogFallback=response.ok;
    }else if(!response.ok&&type==="item"&&response.status===404&&reference.source!=="wid"){
      response=await mlFetch(`https://api.mercadolibre.com/products/${id}`);
      data=await response.json();
      type="catalog_product";
    }

    if(!response.ok)return NextResponse.json({ok:false,error:data?.message||data?.error||"Produto não encontrado."},{status:response.status===404?404:502});

    const pictures=Array.isArray(data.pictures)?data.pictures.map((p:any)=>p?.secure_url||p?.url||null).filter(Boolean):[];
    const priceResult=requestedItemId?await getSalePrice(requestedItemId):{data:null,status:null};
    const salePrice=priceResult.data;
    const note=usedCatalogFallback
      ? salePrice?.price!=null
        ? "O Mercado Livre restringiu os detalhes deste anúncio, então usamos o catálogo para nome e imagens e a API oficial de preços para o valor."
        : "O Mercado Livre restringiu os detalhes deste anúncio. Nome e imagens vieram do catálogo, mas o preço do anúncio também não foi liberado pela API."
      : type==="catalog_product"
        ? "Produto de catálogo identificado. Para preço automático precisamos do ITEM_ID da oferta/anúncio."
        : salePrice?.price!=null
          ? "Preço atual consultado automaticamente pela API oficial de preços do Mercado Livre."
          : "Anúncio identificado, mas a API de preços não retornou um preço para este item.";

    return NextResponse.json({
      ok:true,
      type,
      product:{
        id:requestedItemId||data.id||id,
        catalog_product_id:type==="catalog_product"?data.id||id:data.catalog_product_id||reference.catalogId||null,
        name:data.title||data.name||null,
        status:data.status||null,
        category_id:data.category_id||null,
        domain_id:data.domain_id||null,
        permalink:data.permalink||(value.startsWith("http")?value:null),
        price:salePrice?.price??null,
        original_price:salePrice?.original_price??null,
        currency_id:salePrice?.currency_id||data.currency_id||null,
        available_quantity:type==="item"?data.available_quantity??null:null,
        pictures
      },
      automation:{
        basic_data:true,
        images:pictures.length>0,
        price:salePrice?.price!=null,
        reference_source:reference.source,
        item_access_status:itemAccessStatus,
        price_access_status:priceResult.status,
        catalog_fallback:usedCatalogFallback,
        note
      }
    });
  }catch(error){
    console.error("Erro ao gerar prévia de importação",error);
    const message=error instanceof Error?error.message:"Erro interno ao importar produto.";
    return NextResponse.json({ok:false,error:message},{status:500});
  }
}
