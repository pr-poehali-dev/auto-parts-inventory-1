-- Добавляем user_id в company_settings и меняем уникальный ключ на (user_id, key)
ALTER TABLE t_p26023881_auto_parts_inventory.company_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES t_p26023881_auto_parts_inventory.users(id);

-- Привязываем существующие записи к основному пользователю (89680066666)
UPDATE t_p26023881_auto_parts_inventory.company_settings
  SET user_id = '9775fbb9-558e-4d8e-b688-76b94f4e80f4'
  WHERE user_id IS NULL;

-- Меняем уникальность: теперь (user_id, key) уникальны, а не просто key
ALTER TABLE t_p26023881_auto_parts_inventory.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_key_key;

ALTER TABLE t_p26023881_auto_parts_inventory.company_settings
  ADD CONSTRAINT company_settings_user_key UNIQUE (user_id, key);

CREATE INDEX IF NOT EXISTS idx_company_settings_user_id
  ON t_p26023881_auto_parts_inventory.company_settings(user_id);
