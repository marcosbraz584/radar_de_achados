import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
function money(value:number|string){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value)||0)}

async function createOrder(formData:FormData){
 "use server";
 const user=await getCurrentUser();
 if(!user) redirect("/entrar");
 const sql=getDb();
 const expectedUserId=Number(formData.get("user_id"));
 if(expectedUserId!==Number(user.id)) redirect("/checkout");
 const items=await sql`SELECT ci.quantity,p.id product_id,p.name,p.product_type,p.regular_price,p.promo_price,p.seller_id FROM carts c JOIN cart_items ci ON ci.cart_id=c.id JOIN products p ON p.id=ci.product_id WHERE c.user_id=${Number(user.id)} AND p.active=TRUE AND p.approval_status='approved' ORDER BY ci.created_at`;
 if(!items.length) redirect("/carrinho");
 const subtotal=items.reduce((sum:number,item:any)=>sum+Number(item.promo_price??item.regular_price??0)*Number(item.quantity),0);
 const orderRows=await sql`INSERT INTO orders (user_id,customer_name,customer_email,status,payment_status,subtotal,shipping_total,total) VALUES (${Number(user.id)},${user.full_name},${user.email},'pending_payment','pending',${subtotal},0,${subtotal}) RETURNING id`;
 const orderId=Number((orderRows[0] as any).id);
 try{
  for(const item of items as any[]){const unitPrice=Number(item.promo_price??item.regular_price??0),quantity=Number(item.quantity),itemSubtotal=unitPrice*quantity;await sql`INSERT INTO order_items (order_id,product_id,seller_id,product_name,product_type,quantity,unit_price,subtotal,platform_commission,seller_amount) VALUES (${orderId},${Number(item.product_id)},${item.seller_id?Number(item.seller_id):null},${String(item.name)},${String(item.product_type)},${quantity},${unitPrice},${itemSubtotal},0,${itemSubtotal})`;}
  await sql`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=${Number(user.id)})`;
 }catch(error){await sql`DELETE FROM orders WHERE id=${orderId}`;throw error;}
 redirect(`/pedido/${orderId}`);
}

export default async function CheckoutPage(){const user=await getCurrentUser();if(!user)redirect("/entrar");const sql=getDb();const items=await sql`SELECT ci.quantity,p.id product_id,p.name,p.product_type,p.regular_price,p.promo_price,st.store_name,(SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order,id LIMIT 1) image_url FROM carts c JOIN cart_items ci ON ci.cart_id=c.id JOIN products p ON p.id=ci.product_id LEFT JOIN seller_stores st ON st.seller_id=p.seller_id WHERE c.user_id=${Number(user.id)} ORDER BY ci.created_at DESC`;if(!items.length)redirect("/carrinho");const total=items.reduce((sum:number,item:any)=>sum+Number(item.promo_price??item.regular_price??0)*Number(item.quantity),0),hasPhysical=items.some((item:any)=>item.product_type!=="DIGITAL"),hasDigital=items.some((item:any)=>item.product_type==="DIGITAL");return <main style={{minHeight:"100vh",background:"#f5f7fb",padding:"28px 16px",color:"#172554"}}><section style={{maxWidth:1000,margin:"auto"}}><Link href="/carrinho" style={{textDecoration:"none",fontWeight:800,color:"#2563eb"}}>← Voltar ao carrinho</Link><h1 style={{fontSize:34,marginBottom:8}}>Checkout</h1><p style={{color:"#64748b",marginTop:0}}>Revise seu pedido antes de continuar.</p><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 330px",gap:18,alignItems:"start"}}><div style={{display:"grid",gap:14}}><section style={card}><h2 style={{marginTop:0}}>Produtos</h2>{items.map((item:any)=>{const price=Number(item.promo_price??item.regular_price??0);return <div key={item.product_id} style={{display:"grid",gridTemplateColumns:"64px 1fr auto",gap:12,alignItems:"center",padding:"12px 0",borderTop:"1px solid #e2e8f0"}}>{item.image_url?<img src={item.image_url} alt="" style={{width:64,height:64,objectFit:"contain",borderRadius:8}}/>:<div/>}<div><strong>{item.name}</strong><div style={{fontSize:13,color:"#64748b"}}>Vendido por {item.store_name||"SHILMASTORE"} • {item.product_type==="DIGITAL"?"Digital":"Físico"} • Qtd. {item.quantity}</div></div><strong>{money(price*Number(item.quantity))}</strong></div>})}</section>{hasPhysical?<section style={card}><h2 style={{marginTop:0}}>Entrega</h2><p style={{color:"#64748b"}}>Endereço e frete serão conectados antes da ativação dos pagamentos reais.</p></section>:null}{hasDigital?<section style={card}><h2 style={{marginTop:0}}>Entrega digital</h2><p style={{color:"#475569",marginBottom:0}}>O acesso será liberado somente após a confirmação do pagamento.</p></section>:null}</div><aside style={{...card,position:"sticky",top:18}}><h2 style={{marginTop:0}}>Resumo</h2><div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><span>Subtotal</span><strong>{money(total)}</strong></div><div style={{display:"flex",justifyContent:"space-between",padding:"16px 0",fontSize:22}}><strong>Total</strong><strong>{money(total)}</strong></div><form action={createOrder} method="post"><input type="hidden" name="user_id" value={user.id}/><button type="submit" style={{width:"100%",border:0,borderRadius:9,padding:"14px 16px",fontWeight:900,fontSize:16,background:"#3483fa",color:"white",cursor:"pointer"}}>Criar pedido</button></form><p style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>O pedido será registrado, mas nenhuma cobrança será realizada ainda.</p></aside></div></section></main>}
const card={background:"white",border:"1px solid #e2e8f0",borderRadius:14,padding:20,boxShadow:"0 5px 20px #00000008"};
