"use client";

import { useEffect, useRef, useState } from "react";

type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
};

export default function StoreCategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const roots = categories.filter((category) => category.parent_id === null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="store-categories-menu" ref={wrapperRef}>
      <button
        type="button"
        className="store-categories-trigger"
        aria-expanded={open}
        aria-controls="store-categories-panel"
        onClick={() => setOpen((value) => !value)}
      >
        Categorias <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="store-categories-panel" id="store-categories-panel">
          {roots.length === 0 ? (
            <span className="store-categories-empty">Nenhuma categoria cadastrada.</span>
          ) : (
            roots.map((root) => {
              const children = categories.filter((category) => category.parent_id === root.id);

              return (
                <div className="store-category-root" key={root.id}>
                  <a href={`/categoria/${encodeURIComponent(root.slug)}`} onClick={() => setOpen(false)}>
                    <span>{root.name}</span>
                    {children.length > 0 ? <span aria-hidden="true">›</span> : null}
                  </a>

                  {children.length > 0 ? (
                    <div className="store-category-submenu">
                      {children.map((child) => (
                        <a
                          key={child.id}
                          href={`/categoria/${encodeURIComponent(child.slug)}`}
                          onClick={() => setOpen(false)}
                        >
                          {child.name}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
