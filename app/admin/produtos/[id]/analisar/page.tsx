import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminSidebar from "../../../AdminSidebar";

export const dynamic = "force-dynamic";

async function getProduct(id:number){
  const sql=getDb();
  const rows=await sql`
    SELECT p.*, s.user_id, st.store_name, st.city AS store_city,
           u.name AS seller_name, u.email AS seller_email, u.phone AS seller_phone
    FROM products p
    LEFT JOIN sellers s ON s.id=p.seller_id
    LEFT JOIN seller_stores st ON st.seller_id=s.id
    LEFT JOIN app_users u ON u.id=s.user_id
    WHERE p.id=${id} AND p.sale_mode='OWN'
    LIMIT 1
  `;
  if(!rows[0]) return null;
  const images=await sql`SELECT id,image_url,alt_text,sort_order FROM product_images WHERE product_id=${id} ORDER BY sort_order ASC,id ASC`;
  return {...(rows[0] as any),images};
}

async function moderate(formData:FormData){
  "use server";
  const user=await getCurrentUser();
  if(!user||String((user as any).role||"").toLowerCase()!=="admin") throw new Error("Apenas administradores podem moderar produtos.");
  const id=Number(formData.get("product_id"));
  const decision=String(formData.get("decision")||"");
  const notes=String(formData.get("approval_notes")||"").trim().slice(0,1000);
  if(!Number.isInteger(id)||id<=0) throw new Error("Produto inválido.");
  const sql=getDb();
  if(decision==="approve"){
    await sql`UPDATE products SET approval_status='approved',active=TRUE,approval_notes=${notes||null},approved_by=${Number(user.id)},approved_at=NOW(),updated_at=NOW() WHERE id=${id} AND sale_mode='OWN'`;
  }else if(decision==="reject"){
    if(!notes) throw new Error("Informe o motivo da rejeição para orientar o vendedor.");
    await sql`UPDATE products SET approval_status='rejected',active=FALSE,approval_notes=${notes},approved_by=${Number(user.id)},approved_at=NOW(),updated_at=NOW() WHERE id=${id} AND sale_mode='OWN'`;
  }else throw new Error("Decisão inválida.");
  revalidatePath("/admin/produtos");revalidatePath("/vendedor");revalidatePath("/");
  redirect("/admin/produtos");
}

function money(v:any){if(v===null||v===undefined||v==="")return "—";return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v));}
function value(v:any,suffix=""){return v===null||v===undefined||v===""?"—":`${v}${suffix}`;}
function status(v:any){return v==="approved"?"Aprovado":v==="rejected"?"Rejeitado":"Pendente";}

export default async function AnalisarProdutoPage({params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user) redirect("/entrar");
  if(String((user as any).role||"").toLowerCase()!=="admin") redirect("/minha-conta");
  const {id}=await params;const product=await getProduct(Number(id));if(!product) notFound();
  return <main className="admin-shell"><AdminSidebar/><section className="admin-content" style={{maxWidth:1100}}>
    <header style={{marginBottom:22}}><a href="/admin/produtos" style={{color:"#1f5bbb",fontWeight:800,textDecoration:"none"}}>← Voltar para produtos</a><p className="eyebrow" style={{marginTop:18}}>MODERAÇÃO DE PRODUTO</p><h1 style={{marginBottom:6}}>Analisar produto</h1><p style={{color:"#64748b"}}>Confira as informações enviadas pelo vendedor antes de aprovar ou rejeitar.</p></header>

    <section style={card}><div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}><div><small style={label}>PRODUTO</small><h2 style={{margin:"5px 0 8px"}}>{product.name}</h2><span style={{fontWeight:900,color:product.approval_status==="approved"?"#08783e":product.approval_status==="rejected"?"#b42318":"#9a6700"}}>Status: {status(product.approval_status)}</span></div><div><small style={label}>LOJA / VENDEDOR</small><div style={{fontWeight:900,fontSize:18,marginTop:5}}>{product.store_name||"Loja não informada"}</div><div>{product.seller_name||"—"}</div><div style={{color:"#64748b"}}>{product.seller_email||"—"}</div></div></div></section>

    <section style={card}><h2 style={heading}>Imagens enviadas</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14}}>{product.images.length?product.images.map((img:any)=><a key={img.id} href={img.image_url} target="_blank" rel="noreferrer"><img src={img.image_url} alt={img.alt_text||product.name} style={{width:"100%",height:170,objectFit:"contain",border:"1px solid #e2e8f0",borderRadius:12,background:"#f8fafc"}}/></a>):<p>Nenhuma imagem encontrada.</p>}</div><small style={{color:"#64748b"}}>Clique em uma imagem para visualizá-la em tamanho maior.</small></section>

    <section style={card}><h2 style={heading}>Informações do produto</h2><div style={grid}><Info title="Nome" text={product.name}/><Info title="SKU" text={value(product.sku)}/><Info title="Descrição curta" text={value(product.short_description)}/><Info title="Descrição completa" text={value(product.description)}/></div></section>

    <section style={card}><h2 style={heading}>Preço e estoque</h2><div style={grid}><Info title="Preço" text={money(product.regular_price)}/><Info title="Preço promocional" text={money(product.promo_price)}/><Info title="Estoque" text={value(product.stock_quantity)}/><Info title="Estoque mínimo" text={value(product.minimum_stock)}/></div></section>

    <section style={card}><h2 style={heading}>Envio do produto físico</h2><div style={grid}><Info title="Peso" text={value(product.weight," kg")}/><Info title="Comprimento" text={value(product.length," cm")}/><Info title="Largura" text={value(product.width," cm")}/><Info title="Altura" text={value(product.height," cm")}/><Info title="CEP de origem" text={value(product.origin_zip)}/></div></section>

    <form action={moderate} style={{...card,border:"2px solid #dbeafe"}}><input type="hidden" name="product_id" value={product.id}/><h2 style={heading}>Decisão da SHILMASTORE</h2><label style={{display:"grid",gap:7}}><span style={{fontWeight:800}}>Observação / motivo da rejeição</span><textarea name="approval_notes" defaultValue={product.approval_notes||""} rows={4} maxLength={1000} placeholder="Obrigatório ao rejeitar. Informe claramente o que o vendedor precisa corrigir." style={{width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #cbd5e1",borderRadius:10,font:"inherit"}}/></label><div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}><button name="decision" value="approve" style={{border:0,borderRadius:10,padding:"12px 18px",background:"#15803d",color:"white",fontWeight:900,cursor:"pointer"}}>Aprovar produto</button><button name="decision" value="reject" style={{border:"1px solid #fecaca",borderRadius:10,padding:"11px 18px",background:"#fff1f2",color:"#b42318",fontWeight:900,cursor:"pointer"}}>Rejeitar produto</button></div></form>
  </section></main>;
}

function Info({title,text}:{title:string,text:any}){return <div style={{padding:"12px 0"}}><small style={label}>{title}</small><div style={{marginTop:5,whiteSpace:"pre-wrap",lineHeight:1.5}}>{text}</div></div>}
const card={background:"white",border:"1px solid #e2e8f0",borderRadius:16,padding:22,marginBottom:18,boxShadow:"0 8px 25px #00000008"};
const heading={margin:"0 0 15px",fontSize:21,color:"#172554"};
const label={fontSize:12,fontWeight:900,color:"#64748b",letterSpacing:".04em"};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"0 22px"};
