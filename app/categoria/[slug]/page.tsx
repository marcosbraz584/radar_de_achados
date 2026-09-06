import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Category={id:number;name:string;slug:string;parent_name:string|null};
type Product={id:number;slug:string;name:string;regular_price:string|null;promo_price:string|null;platform:string|null;image_url:string|null;destination_url:string|null;affiliate_url:string|null};

function money(v:string|null){if(!v)return null;const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n):null;}
function platformLabel(v:string|null){const x:Record<string,string>={mercado_livre:"Mercado Livre",shopee:"Shopee",amazon:"Amazon",hotmart:"Hotmart",proprio:"SHILMASTORE",outra:"Outra"};return v?x[v]||v:"";}

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const sql=getDb();
 const rows=await sql`SELECT c.id,c.name,c.slug,p.name parent_name FROM categories c LEFT JOIN categories p ON p.id=c.parent_id WHERE c.slug=${slug} AND c.active=TRUE LIMIT 1`;
 const category=rows[0] as Category|undefined;if(!category)notFound();
 const products=await sql`
  WITH RECURSIVE category_tree AS (
   SELECT id FROM categories WHERE id=${category.id} AND active=TRUE
   UNION ALL
   SELECT c.id FROM categories c JOIN category_tree ct ON c.parent_id=ct.id WHERE c.active=TRUE
  )
  SELECT p.id,p.slug,p.name,p.regular_price,p.promo_price,p.platform,p.destination_url,p.affiliate_url,
   (SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order,pi.id LIMIT 1) image_url
  FROM products p
  WHERE p.active=TRUE AND p.category_id IN (SELECT id FROM category_tree)
  ORDER BY p.featured DESC,p.sort_order,p.updated_at DESC
 ` as Product[];
 return <main style={{minHeight:"100vh",background:"#f5f5f5",color:"#172554"}}>
  <style>{`*{box-sizing:border-box}body{margin:0}.cat-card{transition:.2s;border:1px solid #e5e7eb}.cat-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px #0002}.cat-detail-link{display:flex;flex-direction:column;color:inherit;text-decoration:none}.cat-img{height:205px;min-height:205px;max-height:205px;display:flex;align-items:center;justify-content:center;padding:12px;border-bottom:1px solid #eef2f7;overflow:hidden;background:#fff}.cat-img img{display:block;width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}.cat-body{padding:13px;display:flex;flex-direction:column;gap:7px;background:#fff}.cat-name{font-size:14px;line-height:1.35;color:#334155;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:38px}.cat-price{display:block;font-size:22px;color:#172554}.cat-platform{color:#00a650;font-weight:800;font-size:12px}.cat-button{margin:0 13px 13px;display:block;text-align:center;background:#3483fa;color:#fff;padding:10px 12px;border-radius:8px;font-size:12px;font-weight:800;text-decoration:none}.cat-secondary{display:block;text-align:center;margin:-4px 13px 12px;color:#64748b;font-size:10px;text-decoration:none}.cat-hint{font-size:12px;color:#64748b;margin-top:6px}@media(max-width:720px){.cat-head{padding:18px 12px!important}.cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.cat-wrap{padding:18px 9px 36px!important}.cat-img{height:145px!important;min-height:145px!important;max-height:145px!important;padding:7px!important}.cat-body{padding:9px!important;gap:5px!important}.cat-name{font-size:11px!important;min-height:30px!important}.cat-price{font-size:18px!important}.cat-button{font-size:10px!important;padding:8px 6px!important;margin:0 9px 8px!important}.cat-secondary{font-size:9px!important;margin:0 9px 9px!important}}`}</style>
  <header style={{background:"#ffe600"}}><div className="cat-head" style={{maxWidth:1200,margin:"auto",padding:"22px"}}><a href="/" style={{textDecoration:"none",color:"#172554",fontWeight:900,fontSize:22}}>SHILMASTORE</a><div style={{marginTop:12,fontSize:13}}><a href="/" style={{color:"#174ea6"}}>Início</a> <span>›</span> {category.parent_name?<><span>{category.parent_name}</span> <span>›</span> </>:null}<b>{category.name}</b></div></div></header>
  <section className="cat-wrap" style={{maxWidth:1200,margin:"auto",padding:"32px 22px 55px"}}><h1 style={{margin:"0 0 5px",fontSize:"clamp(27px,4vw,38px)"}}>{category.name}</h1><p style={{margin:"0 0 4px",color:"#64748b"}}>{products.length} produto{products.length===1?"":"s"} encontrado{products.length===1?"":"s"}</p><p className="cat-hint">Use “Ver oferta” para ir direto à loja parceira. Os detalhes continuam disponíveis se quiser consultar antes.</p>
  {products.length===0?<div style={{background:"white",padding:35,borderRadius:12,marginTop:20}}>Ainda não há produtos nesta categoria.</div>:<div className="cat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))",gap:16,marginTop:18}}>{products.map(p=>{const price=money(p.promo_price)||money(p.regular_price);const dest=p.destination_url||p.affiliate_url;return <article className="cat-card" key={p.id} style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px #0000000d"}}><a className="cat-detail-link" href={`/produto/${encodeURIComponent(p.slug)}`}><div className="cat-img">{p.image_url?<img src={p.image_url} alt={p.name}/>:<span style={{color:"#94a3b8"}}>Sem imagem</span>}</div><div className="cat-body"><div className="cat-name">{p.name}</div><strong className="cat-price">{price||"Consulte"}</strong><small className="cat-platform">{platformLabel(p.platform)}</small></div></a>{dest?<a className="cat-button" href={`/go/${p.id}?source=category-page`} target="_blank" rel="nofollow sponsored noopener noreferrer">Ver oferta</a>:null}<a className="cat-secondary" href={`/produto/${encodeURIComponent(p.slug)}`}>Ver detalhes</a></article>})}</div>}
  </section>
 </main>;
}
