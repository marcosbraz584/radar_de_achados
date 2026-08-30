ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';

ALTER TABLE price_history
  DROP CONSTRAINT IF EXISTS price_history_source_check;

ALTER TABLE price_history
  ADD CONSTRAINT price_history_source_check
  CHECK (source IN ('manual', 'automatic'));
