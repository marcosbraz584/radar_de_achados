"use client";

import { usePathname } from "next/navigation";

export default function AdminSidebar(){
  const pathname=usePathname();
  const links=[
    ["/admin","Visão geral"],
    ["/admin/produtos","Produtos"],
    ["/admin/categorias","Categorias"],
    ["/admin/cupons","Cupons"],
    ["/admin/banners","Banners"],
    ["/admin/cliques","Cliques"],
    ["/admin/configuracoes","Configurações"],
  ];
  const isActive=(href:string)=>href==="/admin"?pathname==="/admin":pathname===href||pathname.startsWith(`${href}/`);
  return <aside className="admin-sidebar">
    <div className="admin-brand">
      <div className="admin-logo">SS</div>
      <div><strong>SHILMASTORE</strong><small>Painel administrativo</small></div>
    </div>
    <nav className="admin-nav">
      {links.map(([href,label])=><a key={href} className={isActive(href)?"active":undefined} href={href}>{label}</a>)}
      <a href="/">Ver vitrine</a>
    </nav>
  </aside>;
}
