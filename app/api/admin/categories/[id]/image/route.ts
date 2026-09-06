import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function isValidImageUrl(value:string){
  if(!value)return true;
  try{
    const url=new URL(value);
    return url.protocol==="https:"||url.protocol==="http:";
  }catch{return false;}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id:raw}=await params;
    const id=Number(raw);
    if(!Number.isInteger(id)||id<=0)return NextResponse.json({ok:false,error:"Categoria inválida."},{status:400});

    const body=await request.json() as {image_url?:string|null};
    const imageUrl=String(body.image_url||"").trim();
    if(!isValidImageUrl(imageUrl))return NextResponse.json({ok:false,error:"URL de imagem inválida."},{status:400});

    const sql=getDb();
    const rows=await sql`UPDATE categories SET image_url=${imageUrl||null},updated_at=NOW() WHERE id=${id} RETURNING id,image_url`;
    if(!rows.length)return NextResponse.json({ok:false,error:"Categoria não encontrada."},{status:404});

    return NextResponse.json({ok:true,image_url:rows[0].image_url||null});
  }catch(error){
    console.error("category image save error",error);
    return NextResponse.json({ok:false,error:"Não foi possível salvar a imagem da categoria."},{status:500});
  }
}
