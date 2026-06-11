-- Исправляем тип операций возврата: было 'add' (пополнение), должно быть 'remove' (списание)
UPDATE t_p26023881_auto_parts_inventory.balance_entries
SET entry_type = 'remove'
WHERE id IN ('c1db03b8-3abc-436a-9317-a59913f96877', '1134df7c-75eb-4c1d-abf5-13870d83651d');

-- Пересчитываем баланс Немтинова: было +273+410 лишних, теперь должно быть -273-410
-- Разница: было прибавлено 683, должно быть вычтено 683, итого корректировка -1366
UPDATE t_p26023881_auto_parts_inventory.clients
SET balance = balance - 1366
WHERE last_name = 'Немтинов';