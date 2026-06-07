CREATE TABLE t_p26023881_auto_parts_inventory.clients (
  id TEXT PRIMARY KEY,
  client_type TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  middle_name TEXT,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  address TEXT,
  note TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);