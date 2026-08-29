-- Radar de Achados 2.0
-- Estrutura inicial do banco PostgreSQL (Neon)

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  product_type VARCHAR(20) NOT NULL DEFAULT 'FISICO',
  platform VARCHAR(80),
  marketplace_item_id VARCHAR(40),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  regular_price NUMERIC(12,2),
  promo_price NUMERIC(12,2),
  affiliate_url TEXT NOT NULL,
  button_text VARCHAR(80),
  video_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  offer_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_type_check CHECK (product_type IN ('FISICO', 'DIGITAL')),
  CONSTRAINT products_prices_check CHECK (
    (regular_price IS NULL OR regular_price >= 0) AND
    (promo_price IS NULL OR promo_price >= 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS products_marketplace_item_id_unique
  ON products (marketplace_item_id)
  WHERE marketplace_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id);

CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  code VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coupons_product_idx ON coupons(product_id);
CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons(active);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  regular_price NUMERIC(12,2),
  promo_price NUMERIC(12,2),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_product_idx ON price_history(product_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS clicks (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  destination_url TEXT,
  source VARCHAR(80),
  referrer TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clicks_product_idx ON clicks(product_id);
CREATE INDEX IF NOT EXISTS clicks_clicked_at_idx ON clicks(clicked_at DESC);

CREATE TABLE IF NOT EXISTS banners (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180),
  subtitle VARCHAR(255),
  image_url TEXT NOT NULL,
  target_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banners_active_idx ON banners(active);

CREATE TABLE IF NOT EXISTS store_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(160) NOT NULL DEFAULT 'Radar de Achados',
  logo_url TEXT,
  primary_color VARCHAR(30) DEFAULT '#3483FA',
  top_message TEXT,
  disclosure_text TEXT,
  price_notice TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  whatsapp_url TEXT,
  telegram_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_settings_singleton CHECK (id = 1)
);

INSERT INTO store_settings (id, store_name)
VALUES (1, 'Radar de Achados')
ON CONFLICT (id) DO NOTHING;
