UPDATE t_p26023881_auto_parts_inventory.clients c
SET total_spent = COALESCE((
    SELECT SUM(o.total)
    FROM t_p26023881_auto_parts_inventory.client_orders o
    WHERE o.client_id = c.id AND o.status = 'issued'
), 0);