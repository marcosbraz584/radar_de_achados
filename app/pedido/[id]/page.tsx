import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const SITE_URL = "https://shilmastore.com";

function money(v: number | string) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0); }

async function startMercadoPagoPayment(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const orderId = Number(formData.get("order_id"));
  if (!Number.isInteger(orderId)) redirect("/minha-conta");
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect(`/pedido/${orderId}?payment_error=config`);
  const sql = getDb();
  const orderRows = await sql`SELECT id,customer_email,total,total_amount,payment_status FROM orders WHERE id=${orderId} AND user_id=${Number(user.id)} LIMIT 1`;
  const order = orderRows[0] as any;
  if (!order) redirect("/minha-conta");
  if (order.payment_status === "approved") redirect(`/pedido/${orderId}`);
  const itemRows = await sql`SELECT product_name,quantity,unit_price FROM order_items WHERE order_id=${orderId} ORDER BY id`;
  if (!itemRows.length) redirect(`/pedido/${orderId}?payment_error=items`);
  const items = itemRows.map((item:any)=>({title:String(item.product_name).slice(0,120),quantity:Number(item.quantity),currency_id:"BRL",unit_price:Number(item.unit_price)}));
  const response = await fetch("https://api.mercadopago.com/checkout/preferences",{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      items,
      payer:{email:order.customer_email||user.email},
      external_reference:`shilmastore_${orderId}`,
      back_urls:{success:`${SITE_URL}/pedido/${orderId}?payment_return=success`,failure:`${SITE_URL}/pedido/${orderId}?payment_return=failure`,pending:`${SITE_URL}/pedido/${orderId}?payment_return=pending`},
      auto_return:"approved",
      notification_url:`${SITE_URL}/api/mercado-pago/webhook`,
      statement_descriptor:"SHILMASTORE"
    }),cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  const checkoutUrl=data?.sandbox_init_point||data?.init_point;
  if(!response.ok||!data?.id||!checkoutUrl){console.error("Mercado Pago preference error",response.status,data);redirect(`/pedido/${orderId}?payment_error=mercado_pago`);}
  await sql`UPDATE orders SET payment_provider='mercado_pago',payment_reference=${String(data.id)},updated_at=NOW() WHERE id=${orderId} AND user_id=${Number(user.id)}`;
  redirect(String(checkoutUrl));
}

export default async function OrderPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{payment_error?:string;payment_return?:string}>}){
 const user=await getCurrentUser();if(!user)redirect("/entrar");const {id}=await params;const query=await searchParams;const orderId=Number(id);if(!Number.isInteger(orderId))notFound();const sql=getDb();const rows=await sql`SELECT id,status,payment_status,total,total_amount,payment_provider,payment_reference,created_at FROM orders WHERE id=${orderId} AND user_id=${Number(user.id)} LIMIT 1`;const order=rows[0] as any;if(!order)notFound();const items=await sql`SELECT product_name,product_type,quantity,unit_price,subtotal FROM order_items WHERE order_id=${orderId} ORDER BY id`;const paid=order.payment_status==="approved";const total=order.total_amount??order.total;
 return <main style={{minHeight:"100vh",background:"#f5f7fb",padding:"30px 16px",color:"#172554"}}><section style={{maxWidth:850,margin:"auto"}}><Link href="/" style={{color:"#2563eb",fontWeight:800,textDecoration:"none"}}>← Voltar à vitrine</Link><h1>Pedido #{order.id}</h1>{query.payment_error&&<div style={{...card,marginBottom:14,background:"#fff7ed",borderColor:"#fdba74"}}>Não foi possível iniciar o pagamento no Mercado Pago. Tente novamente em instantes.</div>}{query.payment_return==="pending"&&<div style={{...card,marginBottom:14,background:"#fffbeb"}}>Pagamento aguardando confirmação do Mercado Pago.</div>}{query.payment_return==="failure"&&<div style={{...card,marginBottom:14,background:"#fff7ed"}}>O pagamento não foi concluído. Você pode tentar novamente.</div>}<div style={card}><div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><div><b>Status do pedido</b><div>{paid?"Pagamento confirmado":"Pendente de pagamento"}</div></div><div><b>Pagamento</b><div>{paid?"Aprovado":"Pendente"}</div></div><div><b>Total</b><div style={{fontSize:24,fontWeight:900}}>{money(total)}</div></div></div></div><div style={{...card,marginTop:14}}><h2 style={{marginTop:0}}>Itens do pedido</h2>{items.map((item:any,index:number)=><div key={index} style={{padding:"12px 0",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",gap:12}}><div><strong>{item.product_name}</strong><div style={{fontSize:13,color:"#64748b"}}>{item.product_type==="DIGITAL"?"Produto digital":"Produto físico"} • Qtd. {item.quantity}</div></div><strong>{money(item.subtotal)}</strong></div>)}</div>{!paid&&<div style={{...card,marginTop:14,background:"#eff6ff"}}><strong>Próxima etapa: pagamento</strong><p style={{color:"#475569"}}>Você será direcionado ao ambiente seguro do Mercado Pago. Neste momento estamos usando as credenciais de teste.</p><form action={startMercadoPagoPayment}><input type="hidden" name="order_id" value={order.id}/><button type="submit" style={{border:0,borderRadius:10,padding:"13px 20px",background:"#009ee3",color:"white",fontWeight:900,cursor:"pointer",fontSize:15}}>Pagar com Mercado Pago</button></form></div>}</section></main>;
}
const card={background:"white",border:"1px solid #e2e8f0",borderRadius:14,padding:20,boxShadow:"0 5px 20px #00000008"};
