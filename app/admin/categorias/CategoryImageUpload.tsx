"use client";

import { useRef,useState } from "react";

const MAX_FILE_SIZE=4*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
type SignatureResponse={cloudName?:string;apiKey?:string;timestamp?:number;folder?:string;signature?:string;error?:string};
type PersistResponse={ok?:boolean;id?:number;name?:string;image_url?:string|null;error?:string};

export default function CategoryImageUpload({categoryId,defaultUrl=""}:{categoryId:number;defaultUrl?:string}){
 const[imageUrl,setImageUrl]=useState(defaultUrl);
 const[previewVersion,setPreviewVersion]=useState(0);
 const[status,setStatus]=useState("");
 const[uploading,setUploading]=useState(false);
 const fileInputRef=useRef<HTMLInputElement>(null);

 async function persistImage(url:string){
  const response=await fetch(`/api/admin/categories/${categoryId}/image`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:url}),cache:"no-store"});
  const data=(await response.json()) as PersistResponse;
  if(!response.ok||!data.ok)throw new Error(data.error||"Não foi possível salvar a imagem.");
  if(Number(data.id)!==categoryId)throw new Error("A imagem foi salva em uma categoria diferente. Tente novamente.");
  return data;
 }

 async function handleFile(file:File|undefined){
  if(!file)return;
  if(!ALLOWED_TYPES.has(file.type)){setStatus("Use JPG, PNG ou WEBP.");if(fileInputRef.current)fileInputRef.current.value="";return;}
  if(file.size>MAX_FILE_SIZE){setStatus("A imagem deve ter no máximo 4 MB.");if(fileInputRef.current)fileInputRef.current.value="";return;}
  setUploading(true);
  setStatus("Enviando imagem...");
  try{
   const response=await fetch("/api/admin/banners/cloudinary-signature",{method:"POST",cache:"no-store"});
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
   const saved=await persistImage(result.secure_url);
   setImageUrl(saved.image_url||result.secure_url);
   setPreviewVersion(Date.now());
   setStatus(`✓ Imagem salva em ${saved.name||"categoria"} (ID ${categoryId}).`);
  }catch(error){
   setStatus(error instanceof Error?error.message:"Não foi possível enviar a imagem.");
  }finally{
   setUploading(false);
   if(fileInputRef.current)fileInputRef.current.value="";
  }
 }

 async function removeImage(){
  setUploading(true);
  try{
   const saved=await persistImage("");
   setImageUrl("");
   setPreviewVersion(Date.now());
   setStatus(`✓ Imagem removida de ${saved.name||"categoria"} (ID ${categoryId}).`);
  }catch(error){
   setStatus(error instanceof Error?error.message:"Não foi possível remover a imagem.");
  }finally{
   setUploading(false);
   if(fileInputRef.current)fileInputRef.current.value="";
  }
 }

 const previewUrl=imageUrl?`${imageUrl}${imageUrl.includes("?")?"&":"?"}v=${previewVersion}`:"";

 return <>
  <input type="hidden" name="image_url" value={imageUrl}/>
  <label className="field field-full">
   <span>Imagem do computador — recomendado 256 × 256 px</span>
   <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>void handleFile(e.target.files?.[0])}/>
   <small>JPG, PNG ou WEBP. Preferencialmente quadrada, fundo transparente. Máximo 4 MB.</small>
   {status?<small style={{color:status.startsWith("✓")?"#166534":uploading?"#1e3a8a":"#991b1b",fontWeight:700}}>{status}</small>:null}
  </label>
  <label className="field field-full">
   <span>Ou use uma URL da imagem</span>
   <input type="url" value={imageUrl} onChange={e=>{setImageUrl(e.target.value);setPreviewVersion(Date.now());setStatus("");}} placeholder="https://..."/>
   <small>Se usar URL, clique em Salvar alterações. Se enviar do computador, a imagem será salva automaticamente.</small>
  </label>
  {imageUrl?<div className="field field-full" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <img src={previewUrl} alt="Prévia da categoria" style={{width:110,height:90,objectFit:"contain",border:"1px solid #e2e8f0",borderRadius:12,background:"#fff",padding:8}}/>
   <button type="button" className="secondary-button" disabled={uploading} onClick={()=>void removeImage()}>Remover imagem</button>
  </div>:null}
 </>;
}
