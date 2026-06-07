CREATE TABLE t_p26023881_auto_parts_inventory.balance_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES t_p26023881_auto_parts_inventory.clients(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);