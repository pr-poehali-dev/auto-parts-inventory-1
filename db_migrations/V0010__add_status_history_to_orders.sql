ALTER TABLE t_p26023881_auto_parts_inventory.client_orders
ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- Заполняем историю для существующих заказов
UPDATE t_p26023881_auto_parts_inventory.client_orders
SET status_history = jsonb_build_array(
  jsonb_build_object('status', status, 'date', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'note', '')
)
WHERE status_history = '[]';