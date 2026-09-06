"use client";

import { useRef } from "react";

type Category={id:number;name:string;slug:string;product_count:number;category_image:string|null};

export default function StoreCategoryCarousel({categories}:{categories:Category[]}){
  const trackRef=useRef<HTMLDivElement>(null);
  function scroll(direction:number){trackRef.current?.scrollBy({left:direction*520,behavior:"smooth"});}
  return <section className="sh-category-carousel" aria-label="Categorias em destaque">
    <div className="sh-category-head"><h2>Categorias</h2></div>
    <div className="sh-category-carousel-wrap">
      <button className="sh-category-arrow sh-category-arrow-left" type="button" aria-label="Categorias anteriores" onClick={()=>scroll(-1)}>‹</button>
      <div className="sh-category-track" ref={trackRef}>
        {categories.map(c=><a className="sh-category-tile" key={c.id} href={`/categoria/${encodeURIComponent(c.slug)}`}>
          <div className="sh-category-thumb">{c.category_image?<img src={c.category_image} alt=""/>:<span>{c.name.slice(0,1).toUpperCase()}</span>}</div>
          <strong>{c.name}</strong>
          <small>{c.product_count} {c.product_count===1?"item":"itens"}</small>
        </a>)}
      </div>
      <button className="sh-category-arrow sh-category-arrow-right" type="button" aria-label="Próximas categorias" onClick={()=>scroll(1)}>›</button>
    </div>
  </section>;
}
