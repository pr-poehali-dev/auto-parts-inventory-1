CREATE TABLE t_p26023881_auto_parts_inventory.client_orders (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES t_p26023881_auto_parts_inventory.clients(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'new',
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  prepaid NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);