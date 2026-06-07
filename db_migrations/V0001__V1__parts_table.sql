CREATE TABLE t_p26023881_auto_parts_inventory.parts (
  id TEXT PRIMARY KEY,
  article TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Расходники',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  analogs TEXT[] NOT NULL DEFAULT '{}',
  oem_article TEXT,
  barcode TEXT,
  last_movement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);