"use client";

import { useRef } from "react";

type Category={id:number;name:string;slug:string;product_count:number;image_url:string|null};

function categoryIcon(name:string){
  const n=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(/celular|smartphone|telefone/.test(n))return "📱";
  if(/eletrodomest|casa|lar/.test(n))return "🏠";
  if(/game|console|playstation|xbox|nintendo/.test(n))return "🎮";
  if(/informat|comput|notebook/.test(n))return "💻";
  if(/tv|televis/.test(n))return "📺";
  if(/audio|fone|som/.test(n))return "🎧";
  if(/cozinha|panela/.test(n))return "🍳";
  if(/moda|roupa/.test(n))return "👕";
  if(/calcado|tenis|sapato/.test(n))return "👟";
  if(/brinquedo/.test(n))return "🧸";
  if(/ferrament/.test(n))return "🛠️";
  if(/moveis|movel/.test(n))return "🛋️";
  if(/beleza|perfume|cosmetic/.test(n))return "✨";
  if(/esporte/.test(n))return "⚽";
  if(/livro/.test(n))return "📚";
  return "🛍️";
}

export default function StoreCategoryCarousel({categories}:{categories:Category[]}){
  const trackRef=useRef<HTMLDivElement>(null);
  function scroll(direction:number){trackRef.current?.scrollBy({left:direction*520,behavior:"smooth"});}

  return <section className="sh-category-carousel" aria-label="Categorias em destaque">
    <div className="sh-category-head"><h2>Categorias</h2></div>
    <div className="sh-category-carousel-wrap">
      <button className="sh-category-arrow sh-category-arrow-left" type="button" aria-label="Categorias anteriores" onClick={()=>scroll(-1)}>‹</button>
      <div className="sh-category-track" ref={trackRef}>
        {categories.map(c=><a className="sh-category-tile" style={{flex:"0 0 118px",padding:0,background:"transparent",border:"0",borderRadius:0,boxShadow:"none",overflow:"visible",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",textDecoration:"none"}} key={c.id} href={`/categoria/${encodeURIComponent(c.slug)}`}>
          <div style={{width:96,height:96,background:"transparent",display:"grid",placeItems:"center",overflow:"visible",flexShrink:0}} aria-hidden="true">
            {c.image_url?<img src={c.image_url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<span style={{fontSize:40,lineHeight:1}}>{categoryIcon(c.name)}</span>}
          </div>
          <div style={{width:"100%",marginTop:-3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",background:"transparent"}}>
            <strong style={{fontSize:12,lineHeight:1.15,margin:0,color:"#172554",fontWeight:600}}>{c.name}</strong>
            <small style={{fontSize:9,lineHeight:1.1,color:"#64748b",marginTop:1}}>{c.product_count} {c.product_count===1?"item":"itens"}</small>
          </div>
        </a>)}
      </div>
      <button className="sh-category-arrow sh-category-arrow-right" type="button" aria-label="Próximas categorias" onClick={()=>scroll(1)}>›</button>
    </div>
  </section>;
}
