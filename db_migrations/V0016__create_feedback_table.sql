CREATE TABLE IF NOT EXISTS t_p26023881_auto_parts_inventory.feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_name TEXT,
  user_phone TEXT,
  message TEXT NOT NULL,
  reply TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);