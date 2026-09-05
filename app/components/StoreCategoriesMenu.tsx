"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

export default function StoreCategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roots = categories.filter((category) => category.parent_id === null);

  function isDesktopHover() {
    return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function updatePanelPosition() {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 10;
    const width = Math.min(300, Math.max(220, window.innerWidth - margin * 2));
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - width - margin),
    );

    setPanelPosition({
      top: rect.bottom + 4,
      left,
      width,
    });
  }

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openOnHover() {
    if (!isDesktopHover()) return;
    cancelClose();
    updatePanelPosition();
    setOpen(true);
  }

  function scheduleClose() {
    if (!isDesktopHover()) return;
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const clickedTriggerArea = wrapperRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedTriggerArea && !clickedPanel) setOpen(false);
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
      cancelClose();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  function toggleMenu() {
    if (isDesktopHover()) return;
    if (!open) updatePanelPosition();
    setOpen((value) => !value);
  }

  const panel =
    open && panelPosition ? (
      <div
        ref={panelRef}
        className="store-categories-panel"
        id="store-categories-panel"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        style={{
          position: "fixed",
          top: panelPosition.top,
          left: panelPosition.left,
          width: panelPosition.width,
          zIndex: 1000,
        }}
      >
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
    ) : null;

  return (
    <div
      className="store-categories-menu"
      ref={wrapperRef}
      onMouseEnter={openOnHover}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        className="store-categories-trigger"
        aria-expanded={open}
        aria-controls="store-categories-panel"
        onClick={toggleMenu}
      >
        Categorias <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {panel && typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}
