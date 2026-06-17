CREATE TABLE t_p26023881_auto_parts_inventory.page_visits (
    id SERIAL PRIMARY KEY,
    page VARCHAR(100) NOT NULL,
    user_id INTEGER,
    ip VARCHAR(45),
    user_agent TEXT,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_visits_visited_at ON t_p26023881_auto_parts_inventory.page_visits(visited_at);
CREATE INDEX idx_page_visits_page ON t_p26023881_auto_parts_inventory.page_visits(page);
