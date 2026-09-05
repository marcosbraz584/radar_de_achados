import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Category={id:number;name:string;slug:string;parent_name:string|null};
type Product={id:number;name:string;regular_price:string|null;promo_price:string|null;platform:string|null;image_url:string|null};

function money(v:string|null){if(!v)return null;const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n):null;}
function platformLabel(v:string|null){const x:Record<string,string>={mercado_livre:"Mercado Livre",shopee:"Shopee",amazon:"Amazon",hotmart:"Hotmart",proprio:"SHILMASTORE",outra:"Outra"};return v?x[v]||v:"";}

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const sql=getDb();
 const rows=await sql`SELECT c.id,c.name,c.slug,p.name parent_name FROM categories c LEFT JOIN categories p ON p.id=c.parent_id WHERE c.slug=${slug} AND c.active=TRUE LIMIT 1`;
 const category=rows[0] as Category|undefined;if(!category)notFound();
 const products=await sql`SELECT p.id,p.name,p.regular_price,p.promo_price,p.platform,(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order,pi.id LIMIT 1) image_url FROM products p WHERE p.active=TRUE AND (p.category_id=${category.id} OR p.category_id IN (SELECT id FROM categories WHERE parent_id=${category.id} AND active=TRUE)) ORDER BY p.featured DESC,p.sort_order,p.updated_at DESC` as Product[];
 return <main style={{minHeight:"100vh",background:"#f5f5f5",color:"#172554"}}>
  <style>{`*{box-sizing:border-box}body{margin:0}.cat-card{transition:.2s}.cat-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px #0002}@media(max-width:720px){.cat-head{padding:18px 12px!important}.cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.cat-wrap{padding:18px 9px 36px!important}.cat-img{height:150px!important}.cat-name{font-size:12px!important;min-height:45px}.cat-price{font-size:19px!important}}`}</style>
  <header style={{background:"#ffe600"}}><div className="cat-head" style={{maxWidth:1200,margin:"auto",padding:"22px"}}><a href="/" style={{textDecoration:"none",color:"#172554",fontWeight:900,fontSize:22}}>SHILMASTORE</a><div style={{marginTop:12,fontSize:13}}><a href="/" style={{color:"#174ea6"}}>Início</a> <span>›</span> {category.parent_name?<><span>{category.parent_name}</span> <span>›</span> </>:null}<b>{category.name}</b></div></div></header>
  <section className="cat-wrap" style={{maxWidth:1200,margin:"auto",padding:"32px 22px 55px"}}><h1 style={{margin:"0 0 5px",fontSize:"clamp(27px,4vw,38px)"}}>{category.name}</h1><p style={{margin:"0 0 24px",color:"#64748b"}}>{products.length} produto{products.length===1?"":"s"} encontrado{products.length===1?"":"s"}</p>
  {products.length===0?<div style={{background:"white",padding:35,borderRadius:12}}>Ainda não há produtos nesta categoria.</div>:<div className="cat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))",gap:16}}>{products.map(p=>{const price=money(p.promo_price)||money(p.regular_price);return <article className="cat-card" key={p.id} style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px #0000000d"}}><a href={`/produto/${p.id}`} style={{color:"inherit",textDecoration:"none"}}><div className="cat-img" style={{height:205,display:"grid",placeItems:"center",padding:12,borderBottom:"1px solid #eef2f7"}}>{p.image_url?<img src={p.image_url} alt={p.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<span style={{color:"#94a3b8"}}>Sem imagem</span>}</div><div style={{padding:13}}><div className="cat-name" style={{fontSize:14,lineHeight:1.35,color:"#334155",minHeight:57}}>{p.name}</div><strong className="cat-price" style={{display:"block",fontSize:22,marginTop:8,color:"#172554"}}>{price||"Consulte"}</strong><small style={{color:"#00a650",fontWeight:800}}>{platformLabel(p.platform)}</small></div></a></article>})}</div>}
  </section>
 </main>;
}
