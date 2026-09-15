-- SHILMASTORE
-- Dados privados para entrega de produtos digitais.

CREATE TABLE IF NOT EXISTS product_digital_delivery (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL,
  delivery_url TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_digital_delivery_type_check
    CHECK (delivery_type IN ('FILE', 'LINK')),
  CONSTRAINT product_digital_delivery_content_check
    CHECK (
      (delivery_type = 'FILE' AND file_url IS NOT NULL AND delivery_url IS NULL)
      OR
      (delivery_type = 'LINK' AND delivery_url IS NOT NULL AND file_url IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS product_digital_delivery_product_idx
  ON product_digital_delivery(product_id);
