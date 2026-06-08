
-- Извлекаем артикул из последнего слова названия для позиций с пустым article
UPDATE t_p26023881_auto_parts_inventory.client_orders
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN (item->>'article') = '' OR item->>'article' IS NULL
      THEN item || jsonb_build_object('article', regexp_replace(item->>'name', '^.*[[:space:]/]([^[:space:]/]+)$', '\1'))
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items::text LIKE '%"article": ""%';
