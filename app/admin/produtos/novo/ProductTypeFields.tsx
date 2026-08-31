"use client";

import { useState } from "react";

type Props={
  mercadoLivreImporter:React.ReactNode;
};

export default function ProductTypeFields({mercadoLivreImporter}:Props){
  const [saleMode,setSaleMode]=useState("AFFILIATE");
  const [platform,setPlatform]=useState("mercado_livre");
  const isOwn=saleMode==="OWN";
  const isMercadoLivre=!isOwn&&platform==="mercado_livre";

  function changeSaleMode(value:string){
    setSaleMode(value);
    if(value==="OWN")setPlatform("proprio");
    else if(platform==="proprio")setPlatform("mercado_livre");
  }

  return <>
    {isMercadoLivre&&mercadoLivreImporter}
    <section className="form-card"><h2>Tipo de produto</h2><div className="form-grid two-columns">
      <label className="field"><span>Origem da venda</span><select name="sale_mode" value={saleMode} onChange={e=>changeSaleMode(e.target.value)}><option value="AFFILIATE">Produto afiliado / de terceiros</option><option value="OWN">Produto próprio</option></select></label>
      <label className="field"><span>Formato</span><select name="product_type" defaultValue="FISICO"><option value="FISICO">Produto físico</option><option value="DIGITAL">Produto digital</option></select></label>
      <label className="field field-full"><span>Plataforma / origem</span><select name="platform" value={platform} onChange={e=>setPlatform(e.target.value)} disabled={isOwn}>{isOwn?<option value="proprio">Radar de Achados — produto próprio</option>:<><option value="mercado_livre">Mercado Livre</option><option value="shopee">Shopee</option><option value="amazon">Amazon</option><option value="hotmart">Hotmart</option><option value="outra">Outra plataforma</option></>}</select>{isOwn&&<input type="hidden" name="platform" value="proprio"/>}</label>
    </div></section>
    <section className="form-card"><h2>{isOwn?"Pagamento":"Destino da compra"}</h2><div className="form-grid">
      <label className="field field-full"><span>{isOwn?"Link de pagamento / checkout *":"Link de afiliado *"}</span><input type="url" name="destination_url" required placeholder={isOwn?"Cole aqui o link de pagamento do Mercado Pago":"Cole aqui o seu link de afiliado"}/></label>
      {isOwn&&<label className="field"><span>Meio de pagamento</span><select name="payment_provider" defaultValue="mercado_pago"><option value="mercado_pago">Mercado Pago</option><option value="outro">Outro checkout</option></select></label>}
    </div><p className="admin-subtitle" style={{marginTop:12}}>{isOwn?"O cliente será direcionado ao checkout seguro do provedor de pagamento.":"O cliente será direcionado pelo seu link de afiliado para concluir a compra na plataforma escolhida."}</p></section>
    {isMercadoLivre&&<section className="form-card"><h2>Mercado Livre — automação opcional</h2><div className="form-grid"><label className="field field-full"><span>Link original do produto</span><input type="url" name="marketplace_url"/></label><label className="field field-full"><span>Código MLB do anúncio</span><input name="marketplace_item_id" placeholder="Preenchido automaticamente quando possível"/></label></div></section>}
  </>;
}
