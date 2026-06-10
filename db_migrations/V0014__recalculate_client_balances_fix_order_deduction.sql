
-- Пересчёт балансов: баланс = только операции из balance_entries (пополнения минус ручные снятия)
-- Заказы НЕ влияют на баланс при создании, только при выдаче (issued)
UPDATE t_p26023881_auto_parts_inventory.clients c
SET balance = COALESCE((
  SELECT SUM(
    CASE 
      WHEN be.entry_type IN ('add', 'prepaid', 'refund') THEN be.amount
      WHEN be.entry_type = 'remove' THEN -be.amount
      ELSE 0
    END
  )
  FROM t_p26023881_auto_parts_inventory.balance_entries be
  WHERE be.client_id = c.id
), 0);
