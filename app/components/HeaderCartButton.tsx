"use client";
import {useState} from "react";
import CartDrawer from "./CartDrawer";
export default function HeaderCartButton(){const[open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)} style={{border:0,background:"transparent",color:"#172554",fontWeight:800,fontSize:14,cursor:"pointer",padding:0}}>🛒 Carrinho</button><CartDrawer open={open} onClose={()=>setOpen(false)}/></>}