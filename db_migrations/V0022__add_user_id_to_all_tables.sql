
-- Добавляем user_id во все основные таблицы
ALTER TABLE t_p26023881_auto_parts_inventory.clients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES t_p26023881_auto_parts_inventory.users(id);

ALTER TABLE t_p26023881_auto_parts_inventory.parts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES t_p26023881_auto_parts_inventory.users(id);

ALTER TABLE t_p26023881_auto_parts_inventory.balance_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES t_p26023881_auto_parts_inventory.users(id);

ALTER TABLE t_p26023881_auto_parts_inventory.movements
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES t_p26023881_auto_parts_inventory.users(id);

-- Привязываем существующие записи к первому пользователю (89680066666)
UPDATE t_p26023881_auto_parts_inventory.clients
  SET user_id = '9775fbb9-558e-4d8e-b688-76b94f4e80f4'
  WHERE user_id IS NULL;

UPDATE t_p26023881_auto_parts_inventory.parts
  SET user_id = '9775fbb9-558e-4d8e-b688-76b94f4e80f4'
  WHERE user_id IS NULL;

UPDATE t_p26023881_auto_parts_inventory.balance_entries
  SET user_id = '9775fbb9-558e-4d8e-b688-76b94f4e80f4'
  WHERE user_id IS NULL;

UPDATE t_p26023881_auto_parts_inventory.movements
  SET user_id = '9775fbb9-558e-4d8e-b688-76b94f4e80f4'
  WHERE user_id IS NULL;

-- Индексы для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON t_p26023881_auto_parts_inventory.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_parts_user_id ON t_p26023881_auto_parts_inventory.parts(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_entries_user_id ON t_p26023881_auto_parts_inventory.balance_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON t_p26023881_auto_parts_inventory.movements(user_id);
