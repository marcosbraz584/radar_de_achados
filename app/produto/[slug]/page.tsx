import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import ProductGallery from "./ProductGallery";

export const dynamic = "force-dynamic";

type ProductRow={id:number;name:string;slug:string;description:string|null;regular_price:number|string|null;promo_price:number|string|null;destination_url:string|null;affiliate_url:string|null;platform:string|null;category_name:string|null;category_slug:string|null};
type ImageRow={image_url:string};
function money(value:number|string|null){if(value===null||value===undefined||value==="")return null;const number=Number(value);return Number.isFinite(number)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(number):null}
function platformLabel(value:string|null){const labels:Record<string,string>={mercado_livre:"Mercado Livre",shopee:"Shopee",amazon:"Amazon",hotmart:"Hotmart",proprio:"SHILMASTORE",outra:"Outra plataforma"};return value?labels[value]||value:""}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const sql=getDb();
 const rows=await sql`SELECT p.id,p.name,p.slug,p.description,p.regular_price,p.promo_price,p.destination_url,p.affiliate_url,p.platform,c.name category_name,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.slug=${slug} AND p.active=TRUE LIMIT 1`;
 const product=rows[0] as ProductRow|undefined;if(!product)notFound();
 const imageRows=await sql`SELECT image_url FROM product_images WHERE product_id=${product.id} ORDER BY sort_order ASC,id ASC LIMIT 6` as ImageRow[];
 const images=imageRows.map(r=>r.image_url).filter(Boolean),currentPrice=money(product.promo_price??product.regular_price),oldPrice=product.promo_price?money(product.regular_price):null,destination=product.destination_url||product.affiliate_url;
 return <main className="pd-page">
  <style>{`
   *{box-sizing:border-box}body{margin:0}.pd-page{min-height:100vh;background:#f3f4f6;color:#172554;padding-bottom:60px}.pd-top{background:#ffe600}.pd-top-inner{max-width:1200px;margin:auto;padding:18px 22px;display:flex;align-items:center;gap:28px}.pd-logo{font-size:24px;font-weight:950;color:#172554;text-decoration:none;white-space:nowrap;letter-spacing:.4px}.pd-search{flex:1;background:#fff;border-radius:8px;padding:12px 16px;color:#64748b;box-shadow:0 1px 4px #0002}.pd-wrap{max-width:1200px;margin:auto;padding:18px 22px}.pd-breadcrumb{font-size:13px;color:#64748b;margin:2px 0 15px}.pd-breadcrumb a{color:#2563eb;text-decoration:none}.pd-shell{background:#fff;border-radius:14px;box-shadow:0 2px 12px #00000012;padding:24px;display:grid;grid-template-columns:minmax(380px,1.25fr) minmax(330px,.9fr) 285px;gap:28px;align-items:start}.pd-info{padding-top:4px}.pd-category{color:#2563eb;font-size:13px;font-weight:700;margin-bottom:9px}.pd-title{font-size:26px;line-height:1.22;margin:0 0 14px;color:#1f2937;font-weight:600}.pd-source{font-size:13px;color:#64748b;padding-bottom:18px;border-bottom:1px solid #e5e7eb;margin-bottom:18px}.pd-old{font-size:14px;color:#7c8798;text-decoration:line-through}.pd-price{font-size:36px;line-height:1.05;color:#111827;margin:3px 0 8px;font-weight:500}.pd-offer{display:inline-block;background:#e8f8ee;color:#008f39;font-weight:800;font-size:12px;border-radius:6px;padding:5px 8px}.pd-buybox{border:1px solid #d8dde6;border-radius:12px;padding:20px;position:sticky;top:16px}.pd-buy-price{font-size:27px;color:#111827;font-weight:600;margin-bottom:16px}.pd-stock{color:#008f39;font-size:17px;margin:12px 0}.pd-button{display:block;text-align:center;background:#3483fa;color:#fff;padding:14px 12px;border-radius:9px;font-weight:800;text-decoration:none;font-size:16px}.pd-safe{margin:16px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.5}.pd-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}.pd-benefit{border:1px solid #e8ebf0;border-radius:10px;padding:12px;text-align:center;font-size:12px;color:#475569}.pd-benefit b{display:block;color:#172554;margin-bottom:3px}.pd-description{margin-top:20px;background:#fff;border-radius:14px;padding:28px;box-shadow:0 2px 10px #0000000d}.pd-description h2{margin:0 0 18px;font-size:24px;color:#1f2937}.pd-description-text{white-space:pre-line;line-height:1.7;color:#374151;font-size:15px}.pd-back{display:inline-block;margin-top:18px;color:#2563eb;text-decoration:none;font-weight:700}
   @media(max-width:1000px){.pd-shell{grid-template-columns:minmax(320px,1fr) minmax(300px,1fr)}.pd-buybox{grid-column:2;position:static}.pd-info{grid-column:2;grid-row:1}.pd-shell> :first-child{grid-row:1 / span 2}.pd-benefits{grid-template-columns:1fr}}
   @media(max-width:720px){.pd-top-inner{padding:13px 12px;display:block}.pd-logo{font-size:20px}.pd-search{display:none}.pd-wrap{padding:10px 8px 32px}.pd-breadcrumb{padding:3px 4px;margin-bottom:9px}.pd-shell{display:block;padding:12px;border-radius:10px}.pd-info{padding:14px 3px 0}.pd-title{font-size:21px}.pd-price{font-size:30px}.pd-buybox{margin-top:18px;padding:16px}.pd-benefits{grid-template-columns:repeat(3,1fr);gap:5px}.pd-benefit{padding:9px 4px;font-size:10px}.pd-description{margin-top:10px;border-radius:10px;padding:18px 14px}.pd-description h2{font-size:20px}}
  `}</style>
  <header className="pd-top"><div className="pd-top-inner"><Link href="/" className="pd-logo">SHILMASTORE</Link><div className="pd-search">Buscar produtos, marcas e ofertas...</div></div></header>
  <div className="pd-wrap">
   <div className="pd-breadcrumb"><Link href="/">Início</Link> <span>›</span> {product.category_name&&product.category_slug?<><Link href={`/categoria/${encodeURIComponent(product.category_slug)}`}>{product.category_name}</Link> <span>›</span> </>:null}<span>Produto</span></div>
   <section className="pd-shell">
    <ProductGallery images={images} name={product.name}/>
    <div className="pd-info">
     {product.category_name?<div className="pd-category">{product.category_name}</div>:null}
     <h1 className="pd-title">{product.name}</h1>
     <div className="pd-source">Oferta selecionada na {platformLabel(product.platform)||"plataforma parceira"}</div>
     {oldPrice?<div className="pd-old">De: {oldPrice}</div>:null}
     {currentPrice?<div className="pd-price">{currentPrice}</div>:<div className="pd-price">Consulte</div>}
     {product.promo_price?<span className="pd-offer">Oferta disponível</span>:null}
     <div className="pd-benefits"><div className="pd-benefit"><b>Compra externa</b>Finalização no parceiro</div><div className="pd-benefit"><b>Oferta verificada</b>Produto selecionado</div><div className="pd-benefit"><b>Link seguro</b>Redirecionamento direto</div></div>
    </div>
    <aside className="pd-buybox">
     {currentPrice?<div className="pd-buy-price">{currentPrice}</div>:null}
     <div style={{fontSize:13,color:"#475569"}}>Oferta disponível em</div><div className="pd-stock">{platformLabel(product.platform)||"Loja parceira"}</div>
     {destination?<a className="pd-button" href={`/go/${product.id}?source=product-page`} target="_blank" rel="nofollow sponsored noopener noreferrer">Ver oferta na loja ↗</a>:<div style={{padding:14,background:"#fff4d6",borderRadius:9}}>Link da oferta ainda não cadastrado.</div>}
     <div className="pd-safe">Você será direcionado para a plataforma parceira, onde poderá conferir frete, estoque, condições de pagamento e concluir a compra.</div>
    </aside>
   </section>
   {product.description?<section className="pd-description"><h2>Detalhes do produto</h2><div className="pd-description-text">{product.description}</div></section>:null}
   <Link className="pd-back" href="/#ofertas">← Voltar para as ofertas</Link>
  </div>
 </main>
}
