type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
};

export default function StoreCategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const roots = categories.filter((category) => category.parent_id === null);

  return (
    <details className="store-categories-menu">
      <summary>Categorias ▾</summary>
      <div className="store-categories-panel">
        {roots.length === 0 ? (
          <span className="store-categories-empty">Nenhuma categoria cadastrada.</span>
        ) : (
          roots.map((root) => {
            const children = categories.filter((category) => category.parent_id === root.id);

            return (
              <div className="store-category-root" key={root.id}>
                <a href={`/categoria/${encodeURIComponent(root.slug)}`}>
                  <span>{root.name}</span>
                  {children.length > 0 ? <span aria-hidden="true">›</span> : null}
                </a>

                {children.length > 0 ? (
                  <div className="store-category-submenu">
                    {children.map((child) => (
                      <a key={child.id} href={`/categoria/${encodeURIComponent(child.slug)}`}>
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
    </details>
  );
}
