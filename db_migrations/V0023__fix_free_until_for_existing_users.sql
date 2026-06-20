-- Проставляем free_until = created_at + 90 дней для пользователей без подписки
UPDATE t_p26023881_auto_parts_inventory.users
SET free_until = (created_at + INTERVAL '90 days')::date
WHERE free_until IS NULL AND paid_until IS NULL;
