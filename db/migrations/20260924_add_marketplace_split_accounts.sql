CREATE TABLE IF NOT EXISTS seller_mercado_pago_accounts (
  seller_id BIGINT PRIMARY KEY REFERENCES sellers(id) ON DELETE CASCADE,
  mercado_pago_user_id VARCHAR(80),
  access_token TEXT,
  refresh_token TEXT,
  public_key TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS marketplace_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
  commission_percent NUMERIC(7,4) NOT NULL DEFAULT 10 CHECK (commission_percent>=0 AND commission_percent<=100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO marketplace_settings(id,commission_percent) VALUES(1,10) ON CONFLICT(id) DO NOTHING;
