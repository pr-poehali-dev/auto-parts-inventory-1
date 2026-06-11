CREATE TABLE t_p26023881_auto_parts_inventory.order_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);