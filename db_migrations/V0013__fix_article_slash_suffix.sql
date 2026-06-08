
-- Исправляем артикулы где последний сегмент после / короткий (цифра или 1-2 символа) — берём полный последний токен до /
UPDATE t_p26023881_auto_parts_inventory.client_orders
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN length(item->>'article') <= 2 AND (item->>'name') ~ '[A-Z0-9]+/[0-9]$'
      THEN item || jsonb_build_object('article', regexp_replace(item->>'name', '^.*[[:space:]]([A-Z][A-Z0-9]+/[0-9]+)$', '\1'))
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items::text LIKE '%"article": "5"%';
