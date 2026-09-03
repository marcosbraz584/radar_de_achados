import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type StoreSettings={store_name:string;logo_url:string|null;primary_color:string|null;top_message:string|null;disclosure_text:string|null;price_notice:string|null;instagram_url:string|null;facebook_url:string|null;tiktok_url:string|null;whatsapp_url:string|null;telegram_url:string|null};
type Product={id:number;name:string;description:string|null;regular_price:string|null;promo_price:string|null;destination_url:string|null;affiliate_url:string|null;sale_mode:string|null;product_type:string|null;platform:string|null;button_text:string|null;image_url:string|null;category_name:string|null};
type Category={id:number;name:string;slug:string;product_count:number};

function money(value:string|null){if(!value)return null;const n=Number(value);if(!Number.isFinite(n))return null;return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);}
function platformLabel(value:string|null){const labels:Record<string,string>={mercado_livre:"Mercado Livre",shopee:"Shopee",amazon:"Amazon",hotmart:"Hotmart",proprio:"SHILMASTORE",outra:"Outra plataforma"};return value?labels[value]||value:"";}
function productTypeLabel(value:string|null){return value==="DIGITAL"?"Digital":"Físico";}

export default async function Home(){
  const sql=getDb();
  const [settingsRows,products,categories]=await Promise.all([
    sql`SELECT store_name,logo_url,primary_color,top_message,disclosure_text,price_notice,instagram_url,facebook_url,tiktok_url,whatsapp_url,telegram_url FROM store_settings WHERE id=1 LIMIT 1`,
    sql`SELECT p.id,p.name,p.description,p.regular_price,p.promo_price,p.destination_url,p.affiliate_url,p.sale_mode,p.product_type,p.platform,p.button_text,c.name AS category_name,(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order ASC,pi.id ASC LIMIT 1) AS image_url FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=TRUE ORDER BY p.featured DESC,p.sort_order ASC,p.updated_at DESC`,
    sql`SELECT c.id,c.name,c.slug,COUNT(p.id)::int AS product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.active=TRUE WHERE c.active=TRUE GROUP BY c.id,c.name,c.slug ORDER BY c.sort_order ASC,c.name ASC`
  ]);

  const settings=settingsRows[0] as StoreSettings|undefined;
  const storeName=settings?.store_name&&settings.store_name!=="Radar de Achados"?settings.store_name:"SHILMASTORE";
  const primaryColor=settings?.primary_color??"#3483FA";
  const topMessage=settings?.top_message||"Ofertas selecionadas para você economizar de verdade!";
  const socialLinks=[["Instagram",settings?.instagram_url],["Facebook",settings?.facebook_url],["TikTok",settings?.tiktok_url],["WhatsApp",settings?.whatsapp_url],["Telegram",settings?.telegram_url]].filter((item):item is [string,string]=>Boolean(item[1]));
  const productList=products as Product[];
  const categoryList=categories as Category[];

  return <main style={{minHeight:"100vh",background:"#f4f7fb",color:"#0b2447"}}>
    <div style={{background:"#0b2447",color:"white",textAlign:"center",padding:"9px 18px",fontSize:13,fontWeight:800}}>{topMessage}</div>

    <header style={{background:"#ffe600",borderBottom:"1px solid #e3cf00"}}>
      <div style={{maxWidth:1240,margin:"0 auto",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap"}}>
        <a href="/" style={{display:"flex",alignItems:"center",gap:13,color:"#0b2447",textDecoration:"none"}}>
          {settings?.logo_url?<img src={settings.logo_url} alt={storeName} style={{width:52,height:52,objectFit:"contain",borderRadius:12,background:"white",padding:4}}/>:<div style={{width:52,height:52,borderRadius:15,background:primaryColor,color:"white",display:"grid",placeItems:"center",fontWeight:900,fontSize:17}}>SS</div>}
          <div><strong style={{fontSize:24,letterSpacing:"-.02em"}}>{storeName}</strong><div style={{fontSize:13,fontWeight:600}}>Produtos, ofertas e oportunidades em um só lugar</div></div>
        </a>
        {socialLinks.length>0?<nav style={{display:"flex",gap:16,flexWrap:"wrap"}}>{socialLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{color:"#0b2447",fontWeight:800,textDecoration:"none",fontSize:13}}>{label}</a>)}</nav>:null}
      </div>
    </header>

    {categoryList.length>0?<nav style={{background:"white",borderBottom:"1px solid #e2e8f0"}}><div style={{maxWidth:1240,margin:"0 auto",padding:"12px 24px",display:"flex",gap:10,overflowX:"auto"}}><a href="#ofertas" style={{whiteSpace:"nowrap",padding:"8px 13px",borderRadius:999,background:"#0b2447",color:"white",textDecoration:"none",fontWeight:800,fontSize:13}}>Todos</a>{categoryList.map(c=><a key={c.id} href="#ofertas" style={{whiteSpace:"nowrap",padding:"8px 13px",borderRadius:999,background:"#f1f5f9",color:"#334155",textDecoration:"none",fontWeight:800,fontSize:13,border:"1px solid #e2e8f0"}}>{c.name}{c.product_count>0?` (${c.product_count})`:""}</a>)}</div></nav>:null}

    <section style={{maxWidth:1240,margin:"0 auto",padding:"34px 24px 22px"}}>
      <div style={{background:"#0b2447",borderRadius:24,padding:"clamp(28px,5vw,54px)",display:"grid",gridTemplateColumns:"minmax(0,1.5fr) minmax(240px,.7fr)",gap:28,alignItems:"center",boxShadow:"0 18px 50px rgba(15,35,70,.16)"}}>
        <div>
          <span style={{display:"inline-block",background:"#ffe600",color:"#0b2447",padding:"7px 11px",borderRadius:999,fontWeight:900,fontSize:12,letterSpacing:1}}>DESTAQUES SHILMASTORE</span>
          <h1 style={{color:"white",fontSize:"clamp(34px,5vw,58px)",margin:"18px 0 14px",maxWidth:760,lineHeight:1.02}}>Ofertas que valem a pena</h1>
          <p style={{color:"#cbd5e1",fontSize:18,lineHeight:1.6,maxWidth:720,margin:"0 0 24px"}}>Produtos próprios e ofertas de parceiros selecionados, reunidos em um só lugar para facilitar sua busca.</p>
          <a href="#ofertas" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:"#ffe600",color:"#0b2447",padding:"13px 19px",borderRadius:11,fontWeight:900,textDecoration:"none"}}>Ver ofertas</a>
        </div>
        <div style={{display:"grid",gap:12}}>
          <div style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:18,color:"white"}}><strong style={{fontSize:24}}>{productList.length}</strong><div style={{color:"#cbd5e1",marginTop:4}}>produto{productList.length===1?"":"s"} disponível{productList.length===1?"":"s"}</div></div>
          <div style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:18,color:"white"}}><strong style={{fontSize:24}}>{categoryList.filter(c=>c.product_count>0).length}</strong><div style={{color:"#cbd5e1",marginTop:4}}>categoria{categoryList.filter(c=>c.product_count>0).length===1?"":"s"} com ofertas</div></div>
          <div style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:18,color:"white"}}><strong style={{fontSize:16}}>Multicanal</strong><div style={{color:"#cbd5e1",marginTop:4}}>Produtos próprios e parceiros em uma única vitrine.</div></div>
        </div>
      </div>
    </section>

    <section style={{maxWidth:1240,margin:"0 auto",padding:"8px 24px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:16,padding:18}}><strong>Seleção organizada</strong><p style={{margin:"7px 0 0",color:"#64748b",fontSize:14,lineHeight:1.5}}>Produtos separados por categoria para facilitar sua busca.</p></div>
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:16,padding:18}}><strong>Vários marketplaces</strong><p style={{margin:"7px 0 0",color:"#64748b",fontSize:14,lineHeight:1.5}}>Ofertas de diferentes parceiros reunidas em uma única página.</p></div>
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:16,padding:18}}><strong>Links diretos</strong><p style={{margin:"7px 0 0",color:"#64748b",fontSize:14,lineHeight:1.5}}>Cada oferta leva você diretamente à página correspondente para conferir os detalhes.</p></div>
      </div>
    </section>

    <section id="ofertas" style={{maxWidth:1240,margin:"0 auto",padding:"22px 24px 52px"}}>
      <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:18,marginBottom:20,flexWrap:"wrap"}}><div><p style={{fontWeight:900,color:primaryColor,letterSpacing:1.5,fontSize:12,margin:"0 0 7px"}}>VITRINE</p><h2 style={{fontSize:"clamp(27px,4vw,38px)",margin:0}}>Ofertas em destaque</h2></div><span style={{color:"#64748b",fontSize:14}}>{productList.length} produto{productList.length===1?"":"s"}</span></div>
      {productList.length===0?<div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,padding:40,textAlign:"center"}}><h2>Nenhum produto disponível</h2><p style={{color:"#64748b"}}>Novas ofertas serão publicadas em breve.</p></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,285px))",gap:20,alignItems:"stretch"}}>{productList.map(p=>{const current=money(p.promo_price)||money(p.regular_price);const old=p.promo_price?money(p.regular_price):null;const destination=p.destination_url||p.affiliate_url;const isOwn=p.sale_mode==="OWN";const cta=p.button_text||(isOwn?"Comprar agora":"Ver oferta");return <article key={p.id} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(15,23,42,.06)",display:"flex",flexDirection:"column",minWidth:0}}><div style={{height:190,background:"#fff",display:"grid",placeItems:"center",padding:20,borderBottom:"1px solid #f1f5f9"}}>{p.image_url?<img src={p.image_url} alt={p.name} style={{maxWidth:"82%",maxHeight:"160px",width:"auto",height:"auto",objectFit:"contain"}}/>:<div style={{color:"#94a3b8"}}>Sem imagem</div>}</div><div style={{padding:18,display:"flex",flexDirection:"column",gap:10,flex:1}}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{p.category_name?<span style={{fontSize:11,fontWeight:900,color:primaryColor,textTransform:"uppercase"}}>{p.category_name}</span>:null}<span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"3px 7px",borderRadius:999}}>{isOwn?"Produto próprio":"Afiliado"}</span><span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"3px 7px",borderRadius:999}}>{productTypeLabel(p.product_type)}</span>{platformLabel(p.platform)?<span style={{fontSize:11,fontWeight:800,color:"#475569",background:"#f1f5f9",padding:"3px 7px",borderRadius:999}}>{platformLabel(p.platform)}</span>:null}</div><h3 style={{fontSize:18,lineHeight:1.35,margin:0}}>{p.name}</h3>{p.description?<p style={{color:"#64748b",fontSize:14,lineHeight:1.5,margin:0}}>{p.description}</p>:null}<div style={{marginTop:"auto",paddingTop:8}}>{old?<div style={{color:"#94a3b8",fontSize:13,textDecoration:"line-through"}}>{old}</div>:null}<strong style={{fontSize:25,color:"#111827"}}>{current||"Consulte a oferta"}</strong></div>{destination?<a href={`/go/${p.id}?source=site`} target="_blank" rel={isOwn?"noopener noreferrer":"noopener noreferrer sponsored"} style={{display:"block",textAlign:"center",background:primaryColor,color:"white",padding:"13px 16px",borderRadius:10,fontWeight:900,textDecoration:"none"}}>{cta}</a>:<span style={{display:"block",textAlign:"center",background:"#e2e8f0",color:"#64748b",padding:"13px 16px",borderRadius:10,fontWeight:800}}>Link indisponível</span>}</div></article>})}</div>}
    </section>

    <footer style={{borderTop:"1px solid #dbe3ef",background:"white"}}>
      <div style={{maxWidth:1240,margin:"0 auto",padding:"32px 24px",display:"grid",gridTemplateColumns:"minmax(200px,.8fr) minmax(280px,1.5fr) minmax(180px,.7fr)",gap:28,color:"#64748b",fontSize:13,lineHeight:1.6}}>
        <div><strong style={{display:"block",fontSize:18,color:"#0b2447",marginBottom:7}}>{storeName}</strong><span>Produtos, ofertas e oportunidades em um só lugar.</span></div>
        <div>{settings?.disclosure_text&&!settings.disclosure_text.includes("Radar de Achados")?<p style={{margin:"0 0 8px"}}>{settings.disclosure_text}</p>:<p style={{margin:"0 0 8px"}}>Alguns links podem ser de afiliados. A SHILMASTORE pode receber comissão por compras qualificadas, sem custo adicional para você.</p>}{settings?.price_notice?<p style={{margin:0}}>{settings.price_notice}</p>:<p style={{margin:0}}>Preços e disponibilidade podem mudar sem aviso prévio. Confira as condições na página de compra.</p>}</div>
        <div>{socialLinks.length>0?<><strong style={{display:"block",color:"#0b2447",marginBottom:8}}>Canais</strong>{socialLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{display:"block",color:"#475569",fontWeight:700,textDecoration:"none",marginBottom:5}}>{label}</a>)}</>:<span>SHILMASTORE</span>}</div>
      </div>
    </footer>
  </main>;
}
