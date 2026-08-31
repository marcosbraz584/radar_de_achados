-- Radar de Achados 2.0
-- Expande produtos para vendas próprias e afiliadas em múltiplas plataformas.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_mode VARCHAR(20) NOT NULL DEFAULT 'AFFILIATE',
  ADD COLUMN IF NOT EXISTS destination_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);

UPDATE products
SET destination_url = COALESCE(destination_url, affiliate_url)
WHERE affiliate_url IS NOT NULL;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_sale_mode_check;

ALTER TABLE products
  ADD CONSTRAINT products_sale_mode_check
  CHECK (sale_mode IN ('AFFILIATE', 'OWN'));

-- Produtos próprios podem usar checkout próprio/externo (ex.: Mercado Pago),
-- enquanto produtos afiliados podem continuar usando affiliate_url.
ALTER TABLE products
  ALTER COLUMN affiliate_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS products_sale_mode_idx ON products(sale_mode);
CREATE INDEX IF NOT EXISTS products_platform_idx ON products(platform);
