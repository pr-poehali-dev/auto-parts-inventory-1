ALTER TABLE t_p26023881_auto_parts_inventory.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_until DATE NULL,
  ADD COLUMN IF NOT EXISTS free_until DATE NULL;

UPDATE t_p26023881_auto_parts_inventory.users
SET is_admin = TRUE
WHERE phone = '+79680066666';

UPDATE t_p26023881_auto_parts_inventory.users
SET free_until = (created_at + INTERVAL '3 months')::date
WHERE free_until IS NULL;
