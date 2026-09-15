import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n) : null;
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const sql = getDb();
  const rows = await sql`
    SELECT p.id,p.name,p.short_description,p.description,p.regular_price,p.promo_price,
           p.product_type,p.sku,p.stock_quantity,p.seller_id,st.store_name
    FROM products p
    LEFT JOIN seller_stores st ON st.seller_id=p.seller_id
    WHERE p.id=${productId}
      AND p.sale_mode='OWN'
      AND p.active=TRUE
      AND p.approval_status='approved'
    LIMIT 1
  `;
  if (!rows[0]) notFound();
  const product = rows[0] as any;
  const images = await sql`
    SELECT id,image_url,alt_text,sort_order
    FROM product_images
    WHERE product_id=${productId}
    ORDER BY sort_order ASC,id ASC
  `;

  const current = money(product.promo_price) || money(product.regular_price) || "Consulte";
  const old = product.promo_price ? money(product.regular_price) : null;
  const inStock = product.product_type === "DIGITAL" || Number(product.stock_quantity || 0) > 0;

  return <main style={{minHeight:"100vh",background:"#f5f5f5",color:"#172554"}}>
    <header style={{background:"#ffe600",padding:"14px 20px"}}>
      <div style={{maxWidth:1180,margin:"auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18}}>
        <a href="/" style={{fontSize:22,fontWeight:900,color:"#172554",textDecoration:"none"}}>SHILMASTORE</a>
        <a href="/" style={{color:"#174ea6",fontWeight:800,textDecoration:"none"}}>← Voltar para a vitrine</a>
      </div>
    </header>

    <section style={{maxWidth:1180,margin:"28px auto",padding:"0 18px"}}>
      <div style={{background:"white",borderRadius:16,padding:24,display:"grid",gridTemplateColumns:"minmax(280px,1fr) minmax(280px,1fr)",gap:32,boxShadow:"0 8px 28px #0000000d"}}>
        <div>
          <div style={{minHeight:390,display:"grid",placeItems:"center",border:"1px solid #e5e7eb",borderRadius:14,background:"#fff"}}>
            {images[0]?<img src={(images[0] as any).image_url} alt={(images[0] as any).alt_text||product.name} style={{maxWidth:"100%",maxHeight:390,objectFit:"contain"}}/>:<span style={{color:"#94a3b8"}}>Sem imagem</span>}
          </div>
          {images.length>1?<div style={{display:"flex",gap:10,marginTop:12,overflowX:"auto"}}>{images.map((img:any)=><a key={img.id} href={img.image_url} target="_blank" rel="noreferrer"><img src={img.image_url} alt={img.alt_text||product.name} style={{width:76,height:76,objectFit:"contain",border:"1px solid #e2e8f0",borderRadius:9}}/></a>)}</div>:null}
        </div>

        <div>
          <small style={{fontWeight:900,color:"#2563eb"}}>{product.product_type==="DIGITAL"?"PRODUTO DIGITAL":"PRODUTO FÍSICO"}</small>
          <h1 style={{fontSize:32,lineHeight:1.15,margin:"8px 0 12px"}}>{product.name}</h1>
          {product.short_description?<p style={{fontSize:16,color:"#475569",lineHeight:1.55}}>{product.short_description}</p>:null}
          {old?<div style={{color:"#94a3b8",textDecoration:"line-through",fontSize:15}}>{old}</div>:null}
          <div style={{fontSize:34,fontWeight:800,color:"#111827",margin:"8px 0"}}>{current}</div>
          <div style={{margin:"12px 0",fontWeight:800,color:inStock?"#15803d":"#b42318"}}>{inStock?"Disponível":"Produto sem estoque"}</div>
          <div style={{padding:"12px 14px",background:"#f8fafc",borderRadius:10,color:"#475569",marginBottom:18}}>Vendido por <strong>{product.store_name||"Vendedor SHILMASTORE"}</strong>{product.sku?<> • SKU: {product.sku}</>:null}</div>
          <button disabled={!inStock} style={{width:"100%",border:0,borderRadius:10,padding:"15px 18px",background:inStock?"#3483fa":"#cbd5e1",color:"white",fontSize:16,fontWeight:900,cursor:inStock?"pointer":"not-allowed"}}>Adicionar ao carrinho</button>
          <small style={{display:"block",marginTop:9,color:"#64748b"}}>O carrinho deste produto será conectado ao fluxo de compra da SHILMASTORE.</small>
        </div>
      </div>

      <div style={{background:"white",borderRadius:16,padding:24,marginTop:18,boxShadow:"0 8px 28px #0000000d"}}>
        <h2 style={{marginTop:0}}>Descrição do produto</h2>
        <div style={{whiteSpace:"pre-wrap",lineHeight:1.7,color:"#334155"}}>{product.description||product.short_description||"Descrição não informada."}</div>
      </div>
    </section>
  </main>;
}
