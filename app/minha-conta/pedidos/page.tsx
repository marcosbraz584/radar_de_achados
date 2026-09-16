import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function money(v:number|string){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0)}
function statusLabel(status:string){if(status==="approved")return "Pago";if(status==="rejected"||status==="cancelled")return "Não aprovado";return "Aguardando pagamento"}

export default async function OrdersPage(){
 const user=await getCurrentUser();
 if(!user)redirect("/entrar");
 const sql=getDb();
 const orders=await sql`
  SELECT o.id,o.status,o.payment_status,o.total,o.total_amount,o.created_at,
   COUNT(oi.id)::int AS item_count
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id=o.id
  WHERE o.user_id=${Number(user.id)}
  GROUP BY o.id
  ORDER BY o.created_at DESC
 `;
 return <main style={{minHeight:"100vh",background:"#f5f7fb",padding:"28px 16px",color:"#172554"}}><section style={{maxWidth:900,margin:"auto"}}><Link href="/minha-conta" style={{color:"#2563eb",fontWeight:800,textDecoration:"none"}}>← Minha conta</Link><h1>Meus pedidos</h1>{orders.length===0?<div style={card}>Você ainda não possui pedidos.</div>:<div style={{display:"grid",gap:12}}>{orders.map((order:any)=><Link key={order.id} href={`/pedido/${order.id}`} style={{...card,textDecoration:"none",color:"inherit",display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"center"}}><div><strong>Pedido #{order.id}</strong><div style={{fontSize:13,color:"#64748b",marginTop:5}}>{Number(order.item_count)} {Number(order.item_count)===1?"item":"itens"} • {statusLabel(String(order.payment_status))}</div></div><strong style={{fontSize:18}}>{money(order.total_amount??order.total)}</strong></Link>)}</div>}</section></main>
}
const card={background:"white",border:"1px solid #e2e8f0",borderRadius:14,padding:18,boxShadow:"0 5px 20px #00000008"};
