-- Radar de Achados 2.0
-- Evolução do cadastro para sincronização com Mercado Livre

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS marketplace_product_id VARCHAR(40),
  ADD COLUMN IF NOT EXISTS marketplace_reference_type VARCHAR(20) NOT NULL DEFAULT 'item',
  ADD COLUMN IF NOT EXISTS price_source VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS price_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_sync_status VARCHAR(30) NOT NULL DEFAULT 'pending';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_marketplace_reference_type_check;

ALTER TABLE products
  ADD CONSTRAINT products_marketplace_reference_type_check
  CHECK (marketplace_reference_type IN ('item', 'catalog_product'));

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_price_source_check;

ALTER TABLE products
  ADD CONSTRAINT products_price_source_check
  CHECK (price_source IN ('automatic', 'manual'));

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_price_sync_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_price_sync_status_check
  CHECK (price_sync_status IN ('pending', 'ok', 'restricted', 'error'));

CREATE INDEX IF NOT EXISTS products_marketplace_product_id_idx
  ON products (marketplace_product_id)
  WHERE marketplace_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_price_sync_status_idx
  ON products (price_sync_status);

-- Corrige o produto de catálogo já cadastrado anteriormente.
UPDATE products
SET marketplace_product_id = marketplace_item_id,
    marketplace_item_id = NULL,
    marketplace_reference_type = 'catalog_product',
    price_source = 'manual',
    price_sync_status = 'pending'
WHERE marketplace_item_id = 'MLB51959600'
  AND marketplace_product_id IS NULL;
