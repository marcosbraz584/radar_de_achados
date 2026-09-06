"use client";

import { useState } from "react";

const MAX_FILE_SIZE=4*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
type SignatureResponse={cloudName?:string;apiKey?:string;timestamp?:number;folder?:string;signature?:string;error?:string};

export default function CategoryImageUpload({categoryId,defaultUrl=""}:{categoryId:number;defaultUrl?:string}){
 const[imageUrl,setImageUrl]=useState(defaultUrl);
 const[status,setStatus]=useState("");
 const[uploading,setUploading]=useState(false);

 async function persistImage(url:string){
  const response=await fetch(`/api/admin/categories/${categoryId}/image`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:url})});
  const data=(await response.json()) as {ok?:boolean;error?:string};
  if(!response.ok||!data.ok)throw new Error(data.error||"Não foi possível salvar a imagem.");
 }

 async function handleFile(file:File|undefined){
  if(!file)return;
  if(!ALLOWED_TYPES.has(file.type)){setStatus("Use JPG, PNG ou WEBP.");return;}
  if(file.size>MAX_FILE_SIZE){setStatus("A imagem deve ter no máximo 4 MB.");return;}
  setUploading(true);
  setStatus("Enviando imagem...");
  try{
   const response=await fetch("/api/admin/banners/cloudinary-signature",{method:"POST"});
   const data=(await response.json()) as SignatureResponse;
   if(!response.ok||!data.cloudName||!data.apiKey||!data.timestamp||!data.folder||!data.signature)throw new Error(data.error||"Não foi possível preparar o envio.");
   const body=new FormData();
   body.append("file",file);
   body.append("api_key",data.apiKey);
   body.append("timestamp",String(data.timestamp));
   body.append("folder",data.folder);
   body.append("signature",data.signature);
   const upload=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(data.cloudName)}/image/upload`,{method:"POST",body});
   const result=(await upload.json()) as {secure_url?:string;error?:{message?:string}};
   if(!upload.ok||!result.secure_url)throw new Error(result.error?.message||"Não foi possível enviar a imagem.");
   await persistImage(result.secure_url);
   setImageUrl(result.secure_url);
   setStatus("✓ Imagem enviada e salva na categoria.");
  }catch(error){
   setStatus(error instanceof Error?error.message:"Não foi possível enviar a imagem.");
  }finally{
   setUploading(false);
  }
 }

 async function removeImage(){
  setUploading(true);
  try{
   await persistImage("");
   setImageUrl("");
   setStatus("✓ Imagem removida da categoria.");
  }catch(error){
   setStatus(error instanceof Error?error.message:"Não foi possível remover a imagem.");
  }finally{
   setUploading(false);
  }
 }

 return <>
  <input type="hidden" name="image_url" value={imageUrl}/>
  <label className="field field-full">
   <span>Imagem do computador — recomendado 256 × 256 px</span>
   <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>void handleFile(e.target.files?.[0])}/>
   <small>JPG, PNG ou WEBP. Preferencialmente quadrada, fundo transparente. Máximo 4 MB.</small>
   {status?<small style={{color:status.startsWith("✓")?"#166534":uploading?"#1e3a8a":"#991b1b",fontWeight:700}}>{status}</small>:null}
  </label>
  <label className="field field-full">
   <span>Ou use uma URL da imagem</span>
   <input type="url" value={imageUrl} onChange={e=>{setImageUrl(e.target.value);setStatus("");}} placeholder="https://..."/>
   <small>Se usar URL, clique em Salvar alterações. Se enviar do computador, a imagem será salva automaticamente.</small>
  </label>
  {imageUrl?<div className="field field-full" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <img src={imageUrl} alt="Prévia da categoria" style={{width:110,height:90,objectFit:"contain",border:"1px solid #e2e8f0",borderRadius:12,background:"#fff",padding:8}}/>
   <button type="button" className="secondary-button" disabled={uploading} onClick={()=>void removeImage()}>Remover imagem</button>
  </div>:null}
 </>;
}
