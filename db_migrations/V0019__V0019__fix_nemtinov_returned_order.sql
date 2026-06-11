UPDATE t_p26023881_auto_parts_inventory.client_orders
SET 
  status = 'cancelled',
  items = '[{"name":"Фильтр маслянный","note":"Авторусь","brand":"MANN","price":273,"status":"returned","article":"W 67/2","quantity":1,"costPrice":198.09,"storageCell":"N","expectedDate":"2026-06-10"}]'::jsonb
WHERE id = '7a66c2f6-db2a-4775-aaa8-52969e7cacd0';