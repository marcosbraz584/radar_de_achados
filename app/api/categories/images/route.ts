import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const sql=getDb();
    const rows:any[]=await sql`SELECT id,image_url FROM categories WHERE active=TRUE AND image_url IS NOT NULL AND image_url<>''` as any[];
    const images:Record<number,string>={};
    for(const row of rows){if(row?.id&&typeof row.image_url==="string")images[Number(row.id)]=row.image_url;}
    return NextResponse.json({ok:true,images});
  }catch(error){
    console.error("Erro ao carregar imagens das categorias",error);
    return NextResponse.json({ok:false,images:{}},{status:500});
  }
}
