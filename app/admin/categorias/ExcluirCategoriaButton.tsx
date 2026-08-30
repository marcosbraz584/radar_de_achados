"use client";

export default function ExcluirCategoriaButton({id,action}:{id:number;action:(formData:FormData)=>void|Promise<void>}){
  return <form action={action} onSubmit={(event)=>{if(!window.confirm("Tem certeza que deseja excluir esta categoria? Esta ação não poderá ser desfeita."))event.preventDefault();}}><input type="hidden" name="id" value={id}/><button type="submit" className="secondary-button" style={{color:"#b42318"}}>Excluir</button></form>;
}
