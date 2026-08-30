UPDATE products
SET marketplace_reference_type = 'item'
WHERE marketplace_item_id IS NOT NULL
  AND marketplace_item_id <> '';

UPDATE products
SET marketplace_reference_type = 'catalog_product'
WHERE (marketplace_item_id IS NULL OR marketplace_item_id = '')
  AND marketplace_product_id IS NOT NULL
  AND marketplace_product_id <> '';
