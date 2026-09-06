import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const sql=getDb();
    const rows=await sql`WITH RECURSIVE tree AS (
      SELECT c.id AS root_id,c.id
      FROM categories c
      WHERE c.active=TRUE AND c.parent_id IS NULL
      UNION ALL
      SELECT t.root_id,c.id
      FROM categories c
      JOIN tree t ON c.parent_id=t.id
      WHERE c.active=TRUE
    )
    SELECT root.id,root.name,root.slug,root.parent_id,root.image_url,
      COUNT(DISTINCT p.id)::int AS product_count
    FROM categories root
    JOIN tree t ON t.root_id=root.id
    LEFT JOIN products p ON p.category_id=t.id
      AND p.active=TRUE
      AND (p.platform IS DISTINCT FROM 'mercado_livre' OR p.sale_mode='OWN' OR p.availability_status IS NULL OR p.availability_status='available')
    WHERE root.active=TRUE AND root.parent_id IS NULL
    GROUP BY root.id,root.name,root.slug,root.parent_id,root.image_url,root.sort_order
    ORDER BY root.sort_order,root.name`;
    return NextResponse.json({ok:true,categories:rows},{headers:{"Cache-Control":"no-store, max-age=0"}});
  }catch(error){
    console.error("store categories error",error);
    return NextResponse.json({ok:false,categories:[]},{status:500,headers:{"Cache-Control":"no-store, max-age=0"}});
  }
}
