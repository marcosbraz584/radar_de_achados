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
    <div className="admin-sidebar-brand">
      <strong>SHILMASTORE</strong>
      <small>Painel administrativo</small>
    </div>
    <nav className="admin-sidebar-nav">
      {links.map(([href,label])=><a key={href} href={href}>{label}</a>)}
    </nav>
    <a className="admin-sidebar-store-link" href="/">Ver vitrine</a>
  </aside>;
}
