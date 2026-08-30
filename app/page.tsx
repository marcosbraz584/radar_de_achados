import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type StoreSettings={store_name:string;primary_color:string|null};
type Product={id:number;name:string;description:string|null;regular_price:string|null;promo_price:string|null;affiliate_url:string|null;image_url:string|null;category_name:string|null};

function money(value:string|null){if(!value)return null;const n=Number(value);if(!Number.isFinite(n))return null;return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);}

export default async function Home(){
 const sql=getDb();
 const [settingsRows,products]=await Promise.all([
  sql`SELECT store_name,primary_color FROM store_settings WHERE id=1 LIMIT 1`,
  sql`SELECT p.id,p.name,p.description,p.regular_price,p.promo_price,p.affiliate_url,c.name AS category_name,(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order ASC,pi.id ASC LIMIT 1) AS image_url FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=TRUE ORDER BY p.featured DESC,p.sort_order ASC,p.updated_at DESC`
 ]);
 const settings=settingsRows[0] as StoreSettings|undefined;
 const storeName=settings?.store_name??"Radar de Achados";
 const primaryColor=settings?.primary_color??"#3483FA";
 return <main style={{minHeight:"100vh",background:"#f5f7fb",color:"#0b2447"}}>
  <header style={{background:"#ffe600",padding:"18px 24px",borderBottom:"1px solid #e5cf00"}}><div style={{maxWidth:1180,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}><div style={{width:46,height:46,borderRadius:14,background:primaryColor,color:"white",display:"grid",placeItems:"center",fontWeight:900}}>RA</div><div><strong style={{fontSize:22}}>{storeName}</strong><div style={{fontSize:13}}>Achados, ofertas e oportunidades em um só lugar</div></div></div></header>
  <section style={{maxWidth:1180,margin:"0 auto",padding:"42px 24px 18px"}}><p style={{fontWeight:800,color:primaryColor,letterSpacing:2,fontSize:13}}>OFERTAS SELECIONADAS</p><h1 style={{fontSize:"clamp(30px,5vw,48px)",margin:"8px 0 10px"}}>Achados que valem a pena</h1><p style={{fontSize:18,color:"#64748b",maxWidth:700}}>Produtos cadastrados no Painel 2.0 agora aparecem diretamente na vitrine pública.</p></section>
  <section style={{maxWidth:1180,margin:"0 auto",padding:"20px 24px 60px"}}>{(products as Product[]).length===0?<div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,padding:40,textAlign:"center"}}><h2>Nenhum produto disponível</h2><p style={{color:"#64748b"}}>Ative produtos no painel para exibi-los aqui.</p></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20}}>{(products as Product[]).map(p=>{const current=money(p.promo_price)||money(p.regular_price);const old=p.promo_price?money(p.regular_price):null;return <article key={p.id} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(15,23,42,.06)",display:"flex",flexDirection:"column"}}><div style={{height:230,background:"#fff",display:"grid",placeItems:"center",padding:18}}>{p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<div style={{color:"#94a3b8"}}>Sem imagem</div>}</div><div style={{padding:18,display:"flex",flexDirection:"column",gap:10,flex:1}}>{p.category_name?<span style={{fontSize:12,fontWeight:800,color:primaryColor,textTransform:"uppercase"}}>{p.category_name}</span>:null}<h2 style={{fontSize:18,lineHeight:1.35,margin:0}}>{p.name}</h2>{p.description?<p style={{color:"#64748b",fontSize:14,lineHeight:1.5,margin:0}}>{p.description}</p>:null}<div style={{marginTop:"auto",paddingTop:8}}>{old?<div style={{color:"#94a3b8",fontSize:13,textDecoration:"line-through"}}>{old}</div>:null}<strong style={{fontSize:25,color:"#111827"}}>{current||"Consulte a oferta"}</strong></div>{p.affiliate_url?<a href={`/go/${p.id}?source=site`} target="_blank" rel="noopener noreferrer sponsored" style={{display:"block",textAlign:"center",background:primaryColor,color:"white",padding:"13px 16px",borderRadius:10,fontWeight:800,textDecoration:"none"}}>Ver oferta</a>:<span style={{display:"block",textAlign:"center",background:"#e2e8f0",color:"#64748b",padding:"13px 16px",borderRadius:10,fontWeight:800}}>Link indisponível</span>}</div></article>})}</div>}</section>
 </main>;
}
