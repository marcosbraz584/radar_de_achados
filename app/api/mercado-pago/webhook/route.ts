import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getPayment(paymentId:string, token:string){
  const response=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,{
    headers:{Authorization:`Bearer ${token}`},cache:"no-store"
  });
  if(!response.ok) return null;
  return response.json();
}

export async function POST(request:NextRequest){
  try{
    const token=process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if(!token) return NextResponse.json({ok:false},{status:500});
    const body=await request.json().catch(()=>({}));
    const url=new URL(request.url);
    const type=String(body?.type||body?.topic||url.searchParams.get("type")||url.searchParams.get("topic")||"");
    const paymentId=String(body?.data?.id||url.searchParams.get("data.id")||url.searchParams.get("id")||"");
    if(type!=="payment"||!paymentId) return NextResponse.json({ok:true,ignored:true});

    const payment=await getPayment(paymentId,token);
    if(!payment) return NextResponse.json({ok:false},{status:502});
    const externalReference=String(payment.external_reference||"");
    const match=/^shilmastore_(\d+)$/.exec(externalReference);
    if(!match) return NextResponse.json({ok:true,ignored:true});
    const orderId=Number(match[1]);
    const sql=getDb();
    const rows=await sql`SELECT id,total,total_amount,payment_status FROM orders WHERE id=${orderId} LIMIT 1`;
    const order=rows[0] as any;
    if(!order) return NextResponse.json({ok:true,ignored:true});

    const expected=Number(order.total_amount??order.total??0);
    const received=Number(payment.transaction_amount??0);
    const currency=String(payment.currency_id||"");
    if(currency!=="BRL"||Math.abs(expected-received)>0.01) return NextResponse.json({ok:false,error:"payment_mismatch"},{status:409});

    const status=String(payment.status||"");
    if(status==="approved"){
      await sql`UPDATE orders SET payment_status='approved',status='paid',payment_provider='mercado_pago',payment_reference=${paymentId},paid_at=COALESCE(paid_at,NOW()),updated_at=NOW() WHERE id=${orderId}`;
    }else if(status==="pending"||status==="in_process"){
      await sql`UPDATE orders SET payment_status='pending',payment_provider='mercado_pago',payment_reference=${paymentId},updated_at=NOW() WHERE id=${orderId} AND payment_status<>'approved'`;
    }else if(["rejected","cancelled","refunded","charged_back"].includes(status)){
      await sql`UPDATE orders SET payment_status=${status},payment_provider='mercado_pago',payment_reference=${paymentId},updated_at=NOW() WHERE id=${orderId} AND payment_status<>'approved'`;
    }
    return NextResponse.json({ok:true});
  }catch(error){
    console.error("Mercado Pago webhook error",error);
    return NextResponse.json({ok:false},{status:500});
  }
}
