ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS availability_checked_at TIMESTAMPTZ;
