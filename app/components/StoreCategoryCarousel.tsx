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
        {categories.map(c=><a className="sh-category-tile" key={c.id} href={`/categoria/${encodeURIComponent(c.slug)}`}>
          <div className="sh-category-thumb" aria-hidden="true">{c.image_url?<img src={c.image_url} alt=""/>:<span style={{fontSize:36,lineHeight:1}}>{categoryIcon(c.name)}</span>}</div>
          <strong>{c.name}</strong>
          <small>{c.product_count} {c.product_count===1?"item":"itens"}</small>
        </a>)}
      </div>
      <button className="sh-category-arrow sh-category-arrow-right" type="button" aria-label="Próximas categorias" onClick={()=>scroll(1)}>›</button>
    </div>
  </section>;
}
