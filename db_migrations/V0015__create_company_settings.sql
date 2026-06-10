CREATE TABLE IF NOT EXISTS t_p26023881_auto_parts_inventory.company_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT
);

INSERT INTO t_p26023881_auto_parts_inventory.company_settings (key, value) VALUES
  ('name', ''),
  ('inn', ''),
  ('ogrn', ''),
  ('address', ''),
  ('phone', ''),
  ('email', '')
ON CONFLICT (key) DO NOTHING;
