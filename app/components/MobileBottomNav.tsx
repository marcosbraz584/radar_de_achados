"use client";

import { useEffect, useRef, useState } from "react";

export default function MobileBottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function focusSearch() {
    setMenuOpen(false);
    const input = document.querySelector<HTMLInputElement>('input[name="q"]');
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => input.focus(), 350);
    }
  }

  function openCategories() {
    setMenuOpen(false);
    const trigger = document.querySelector<HTMLButtonElement>(".store-categories-trigger");
    if (trigger) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => trigger.click(), 350);
    }
  }

  return (
    <>
      <style>{`
        .sh-mobile-bottom-nav{display:none}
        @media(max-width:720px){
          body{padding-bottom:66px}
          .sh-mobile-bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:1000;height:62px;background:#fff;border-top:1px solid #ddd;box-shadow:0 -4px 16px #00000014;display:grid;grid-template-columns:repeat(5,1fr);padding-bottom:env(safe-area-inset-bottom)}
          .sh-mobile-bottom-nav a,.sh-mobile-bottom-nav button{border:0;background:transparent;text-decoration:none;color:#334155;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:700 10px Arial,sans-serif;cursor:pointer;padding:5px 2px}
          .sh-mobile-bottom-nav .sh-mob-icon{font-size:20px;line-height:20px;font-weight:400;color:#172554}
          .sh-mobile-bottom-nav a:first-child .sh-mob-icon{color:#3483fa}
          .sh-mobile-more{position:fixed;right:10px;bottom:70px;z-index:999;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 30px #0003;padding:7px;min-width:180px}
          .sh-mobile-more a{display:block;padding:11px 12px;border-radius:8px;color:#172554;text-decoration:none;font-size:13px;font-weight:700}
          .sh-mobile-more a:hover{background:#f2f6ff}
        }
      `}</style>
      {menuOpen ? (
        <div ref={menuRef} className="sh-mobile-more" role="menu">
          <a href="/" role="menuitem" onClick={() => setMenuOpen(false)}>Página inicial</a>
          <a href="/#ofertas" role="menuitem" onClick={() => setMenuOpen(false)}>Todas as ofertas</a>
        </div>
      ) : null}
      <nav className="sh-mobile-bottom-nav" aria-label="Navegação principal no celular">
        <a href="/"><span className="sh-mob-icon">⌂</span><span>Início</span></a>
        <button type="button" onClick={openCategories}><span className="sh-mob-icon">▦</span><span>Categorias</span></button>
        <a href="/#ofertas"><span className="sh-mob-icon">%</span><span>Ofertas</span></a>
        <button type="button" onClick={focusSearch}><span className="sh-mob-icon">⌕</span><span>Buscar</span></button>
        <button type="button" onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen}><span className="sh-mob-icon">☰</span><span>Menu</span></button>
      </nav>
    </>
  );
}
