import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type StoreSettings = {
  store_name: string;
  primary_color: string | null;
};

export default async function Home() {
  const sql = getDb();

  const [settingsRows, productCountRows, categoryCountRows] = await Promise.all([
    sql`SELECT store_name, primary_color FROM store_settings WHERE id = 1 LIMIT 1`,
    sql`SELECT COUNT(*)::int AS total FROM products`,
    sql`SELECT COUNT(*)::int AS total FROM categories`,
  ]);

  const settings = settingsRows[0] as StoreSettings | undefined;
  const storeName = settings?.store_name ?? "Radar de Achados";
  const primaryColor = settings?.primary_color ?? "#3483FA";
  const productCount = Number(productCountRows[0]?.total ?? 0);
  const categoryCount = Number(categoryCountRows[0]?.total ?? 0);

  return (
    <main className="home">
      <section className="statusCard" style={{ borderTop: `6px solid ${primaryColor}` }}>
        <div className="brandMark">RA</div>
        <p className="eyebrow">BANCO DE DADOS CONECTADO</p>
        <h1>{storeName} 2.0</h1>
        <p className="description">
          Esta página agora está lendo informações diretamente do PostgreSQL no Neon.
        </p>

        <div className="databaseStats">
          <div className="statBox">
            <strong>{productCount}</strong>
            <span>Produtos</span>
          </div>
          <div className="statBox">
            <strong>{categoryCount}</strong>
            <span>Categorias</span>
          </div>
        </div>

        <div className="status"><span /> Next.js conectado ao banco com sucesso</div>
      </section>
    </main>
  );
}
