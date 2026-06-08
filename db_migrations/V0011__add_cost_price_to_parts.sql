ALTER TABLE t_p26023881_auto_parts_inventory.parts
ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;