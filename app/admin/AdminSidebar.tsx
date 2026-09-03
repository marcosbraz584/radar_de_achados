export default function AdminSidebar(){
  const links=[
    ["/admin","Visão geral"],
    ["/admin/produtos","Produtos"],
    ["/admin/categorias","Categorias"],
    ["/admin/cupons","Cupons"],
    ["/admin/banners","Banners"],
    ["/admin/cliques","Cliques"],
    ["/admin/configuracoes","Configurações"],
  ];
  return <aside className="admin-sidebar">
    <div className="admin-brand">
      <div className="admin-logo">SS</div>
      <div><strong>SHILMASTORE</strong><small>Painel administrativo</small></div>
    </div>
    <nav className="admin-nav">
      {links.map(([href,label],index)=><a key={href} className={index===0?"active":undefined} href={href}>{label}</a>)}
      <a href="/">Ver vitrine</a>
    </nav>
  </aside>;
}
