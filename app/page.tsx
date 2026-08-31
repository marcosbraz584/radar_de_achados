import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type StoreSettings={
  store_name:string;
  primary_color:string|null;
  top_message:string|null;
  disclosure_text:string|null;
  price_notice:string|null;
  instagram_url:string|null;
  facebook_url:string|null;
  tiktok_url:string|null;
  whatsapp_url:string|null;
  telegram_url:string|null;
};

type Product={
  id:number;
  name:string;
  description:string|null;
  regular_price:string|null;
  promo_price:string|null;
  destination_url:string|null;
  affiliate_url:string|null;
  sale_mode:string|null;
  product_type:string|null;
  platform:string|null;
  button_text:string|null;
  image_url:string|null;
  category_name:string|null;
};

function money(value:string|null){if(!value)return null;const n=Number(value);if(!Number.isFinite(n))return null;return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);}
function platformLabel(value:string|null){const labels:Record<string,string>={mercado_livre:"Mercado Livre",shopee:"Shopee",amazon:"Amazon",hotmart:"Hotmart",proprio:"Radar de Achados",outra:"Outra plataforma"};return value?labels[value]||value:"";}
function productTypeLabel(value:string|null){return value==="DIGITAL"?"Digital":"Físico";}

export default async function Home(){
 const sql=getDb();
 const [settingsRows,products]=await Promise.all([
  sql`SELECT store_name,primary_color,top_message,disclosure_text,price_notice,instagram_url,facebook_url,tiktok_url,whatsapp_url,telegram_url FROM store_settings WHERE id=1 LIMIT 1`,
  sql`SELECT p.id,p.name,p.description,p.regular_price,p.promo_price,p.destination_url,p.affiliate_url,p.sale_mode,p.product_type,p.platform,p.button_text,c.name AS category_name,(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order ASC,pi.id ASC LIMIT 1) AS image_url FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=TRUE ORDER BY p.featured DESC,p.sort_order ASC,p.updated_at DESC`
 ]);
 const settings=settingsRows[0] as StoreSettings|undefined;
 const storeName=settings?.store_name??"Radar de Achados";
 const primaryColor=settings?.primary_color??"#3483FA";
 const topMessage=settings?.top_message||"Ofertas selecionadas para você economizar de verdade!";
 const socialLinks=[
  ["Instagram",settings?.instagram_url],["Facebook",settings?.facebook_url],["TikTok",settings?.tiktok_url],["WhatsApp",settings?.whatsapp_url],["Telegram",settings?.telegram_url]
 ].filter((item):item is [string,string]=>Boolean(item[1]));
 const productList=products as Product[];
 return <main style={{minHeight:"100vh",background:"#f5f7fb",color:"#0b2447"}}>
  <div style={{background:"#0b2447",color:"white",textAlign:"center",padding:"9px 18px",fontSize:14,fontWeight:700}}>{topMessage}</div>
  <header style={{background:"#ffe600",padding:"18px 24px",borderBottom:"1px solid #e5cf00"}}><div style={{maxWidth:1180,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:46,height:46,borderRadius:14,background:primaryColor,color:"white",display:"grid",placeItems:"center",fontWeight:900}}>RA</div><div><strong style={{fontSize:22}}>{storeName}</strong><div style={{fontSize:13}}>Achados, ofertas e oportunidades em um só lugar</div></div></div>{socialLinks.length>0?<nav style={{display:"flex",gap:14,flexWrap:"wrap"}}>{socialLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{color:"#0b2447",fontWeight:800,textDecoration:"none",fontSize:13}}>{label}</a>)}</nav>:null}</div></header>
  <section style={{maxWidth:1180,margin:"0 auto",padding:"42px 24px 18px"}}><p style={{fontWeight:800,color:primaryColor,letterSpacing:2,fontSize:13}}>OFERTAS SELECIONADAS</p><h1 style={{fontSize:"clamp(30px,5vw,48px)",margin:"8px 0 10px"}}>Achados que valem a pena</h1><p style={{fontSize:18,color:"#64748b",maxWidth:760}}>Produtos próprios e ofertas de parceiros reunidos em um só lugar para facilitar sua busca.</p></section>
  <section style={{maxWidth:1180,margin:"0 auto",padding:"20px 24px 34px"}}>{productList.length===0?<div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,padding:40,textAlign:"center"}}><h2>Nenhum produto disponível</h2><p style={{color:"#64748b"}}>Novas ofertas serão publicadas em breve.</p></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20}}>{productList.map(p=>{const current=money(p.promo_price)||money(p.regular_price);const old=p.promo_price?money(p.regular_price):null;const destination=p.destination_url||p.affiliate_url;const isOwn=p.sale_mode==="OWN";const cta=p.button_text||(isOwn?"Comprar agora":"Ver oferta");return <article key={p.id} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(15,23,42,.06)",display:"flex",flexDirection:"column"}}><div style={{height:210,background:"#fff",display:"grid",placeItems:"center",padding:18}}>{p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<div style={{color:"#94a3b8"}}>Sem imagem</div>}</div><div style={{padding:18,display:"flex",flexDirection:"column",gap:10,flex:1}}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{p.category_name?<span style={{fontSize:11,fontWeight:800,color:primaryColor,textTransform:"uppercase"}}>{p.category_name}</span>:null}<span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"2px 7px",borderRadius:999}}>{isOwn?"Produto próprio":"Afiliado"}</span><span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"2px 7px",borderRadius:999}}>{productTypeLabel(p.product_type)}</span>{platformLabel(p.platform)?<span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"2px 7px",borderRadius:999}}>{platformLabel(p.platform)}</span>:null}</div><h2 style={{fontSize:18,lineHeight:1.35,margin:0}}>{p.name}</h2>{p.description?<p style={{color:"#64748b",fontSize:14,lineHeight:1.5,margin:0}}>{p.description}</p>:null}<div style={{marginTop:"auto",paddingTop:8}}>{old?<div style={{color:"#94a3b8",fontSize:13,textDecoration:"line-through"}}>{old}</div>:null}<strong style={{fontSize:25,color:"#111827"}}>{current||"Consulte a oferta"}</strong></div>{destination?<a href={`/go/${p.id}?source=site`} target="_blank" rel={isOwn?"noopener noreferrer":"noopener noreferrer sponsored"} style={{display:"block",textAlign:"center",background:primaryColor,color:"white",padding:"13px 16px",borderRadius:10,fontWeight:800,textDecoration:"none"}}>{cta}</a>:<span style={{display:"block",textAlign:"center",background:"#e2e8f0",color:"#64748b",padding:"13px 16px",borderRadius:10,fontWeight:800}}>Link indisponível</span>}</div></article>})}</div>}</section>
  <footer style={{borderTop:"1px solid #e2e8f0",background:"white",padding:"24px"}}><div style={{maxWidth:1180,margin:"0 auto",color:"#64748b",fontSize:13,lineHeight:1.6}}>{settings?.disclosure_text?<p style={{margin:"0 0 8px"}}>{settings.disclosure_text}</p>:<p style={{margin:"0 0 8px"}}>Alguns links podem ser de afiliados. O Radar de Achados pode receber comissão por compras qualificadas, sem custo adicional para você.</p>}{settings?.price_notice?<p style={{margin:0}}>{settings.price_notice}</p>:<p style={{margin:0}}>Preços e disponibilidade podem mudar sem aviso prévio. Confira as condições na página de compra.</p>}</div></footer>
 </main>;
}
