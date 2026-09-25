ALTER TABLE products
  ADD COLUMN IF NOT EXISTS item_condition VARCHAR(20) NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_item_condition_check;
ALTER TABLE products ADD CONSTRAINT products_item_condition_check
  CHECK (item_condition IN ('NEW','USED'));

CREATE INDEX IF NOT EXISTS products_condition_idx ON products(item_condition);
CREATE INDEX IF NOT EXISTS products_city_state_idx ON products(state_code,city);
