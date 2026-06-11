import json
import os
import uuid
from datetime import datetime, timezone
from datetime import date
import psycopg2

SCHEMA = 't_p26023881_auto_parts_inventory'

# Допустимые статусы и их русские названия
STATUSES = ['new', 'ordered', 'in_stock', 'issued', 'cancelled']

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

def resp(status, body):
    return {'statusCode': status, 'headers': {**cors_headers(), 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False, default=str)}

def row_to_order(cols, row):
    d = dict(zip(cols, row))
    history = d.get('status_history', [])
    if isinstance(history, str):
        history = json.loads(history)
    return {
        'id': d['id'],
        'clientId': d['client_id'],
        'date': str(d['date']),
        'status': d['status'],
        'statusHistory': history,
        'items': d['items'] if isinstance(d['items'], list) else json.loads(d['items']),
        'total': float(d['total']),
        'prepaid': float(d['prepaid']),
        'note': d.get('note'),
        'clientBalance': float(d['client_balance']) if d.get('client_balance') is not None else 0.0,
    }

def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def handler(event: dict, context) -> dict:
    """CRUD для заказов и баланса клиентов"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    body_raw = event.get('body') or '{}'

    order_id = qs.get('id')
    client_id_qs = qs.get('clientId')
    action = qs.get('action', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET список заказов
        if method == 'GET' and action not in ('balance', 'returns'):
            if client_id_qs:
                cur.execute(f"""
                    SELECT o.id, o.client_id, o.date, o.status, o.status_history, o.items, o.total, o.prepaid, o.note,
                           c.balance as client_balance
                    FROM {SCHEMA}.client_orders o
                    JOIN {SCHEMA}.clients c ON c.id = o.client_id
                    WHERE o.client_id = %s
                    ORDER BY o.date DESC, o.created_at DESC
                """, (client_id_qs,))
            else:
                cur.execute(f"""
                    SELECT o.id, o.client_id, o.date, o.status, o.status_history, o.items, o.total, o.prepaid, o.note,
                           c.balance as client_balance
                    FROM {SCHEMA}.client_orders o
                    JOIN {SCHEMA}.clients c ON c.id = o.client_id
                    ORDER BY o.date DESC, o.created_at DESC
                """)
            cols = [d[0] for d in cur.description]
            rows = [row_to_order(cols, row) for row in cur.fetchall()]
            return resp(200, rows)

        # GET история баланса
        if method == 'GET' and action == 'balance':
            cur.execute(f"""
                SELECT id, client_id, date, entry_type, amount, note, order_id
                FROM {SCHEMA}.balance_entries
                WHERE client_id = %s
                ORDER BY created_at DESC
            """, (client_id_qs,))
            cols = [d[0] for d in cur.description]
            rows = []
            for row in cur.fetchall():
                d = dict(zip(cols, row))
                rows.append({
                    'id': d['id'], 'date': str(d['date']), 'type': d['entry_type'],
                    'amount': float(d['amount']), 'note': d['note'], 'orderId': d['order_id'],
                })
            return resp(200, rows)

        # POST создать заказ
        if method == 'POST' and action not in ('balance', 'return'):
            body = json.loads(body_raw)
            oid = str(uuid.uuid4())
            items = body.get('items', [])
            total = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in items)
            prepaid = float(body.get('prepaid', 0))
            initial_status = body.get('status', 'new')
            initial_history = json.dumps([{'status': initial_status, 'date': now_iso(), 'note': ''}])

            cur.execute(f"""
                INSERT INTO {SCHEMA}.client_orders
                  (id, client_id, date, status, status_history, items, total, prepaid, note)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (
                oid, body.get('clientId'), body.get('date', date.today().isoformat()),
                initial_status, initial_history,
                json.dumps(items, ensure_ascii=False),
                total, prepaid, body.get('note'),
            ))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]
            cur.execute(f"""
                UPDATE {SCHEMA}.clients
                SET total_orders = total_orders + 1, balance = balance + %s
                WHERE id = %s
            """, (prepaid, body.get('clientId')))
            if prepaid > 0:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                    VALUES (%s,%s,%s,'prepaid',%s,'Предоплата по заказу',%s)
                """, (str(uuid.uuid4()), body.get('clientId'), date.today().isoformat(), prepaid, oid))
            conn.commit()
            return resp(201, row_to_order(cols, row))

        # POST баланс
        if method == 'POST' and action == 'balance':
            body = json.loads(body_raw)
            cid = body.get('clientId')
            entry_type = body.get('type', 'add')
            amount = float(body.get('amount', 0))
            sign = 1 if entry_type == 'add' else -1
            cur.execute(f"UPDATE {SCHEMA}.clients SET balance = balance + %s WHERE id = %s", (sign * amount, cid))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (str(uuid.uuid4()), cid, date.today().isoformat(), entry_type, amount, body.get('note')))
            cur.execute(f"SELECT balance FROM {SCHEMA}.clients WHERE id = %s", (cid,))
            new_balance = float(cur.fetchone()[0])
            conn.commit()
            return resp(200, {'balance': new_balance})

        # PUT обновить заказ
        if method == 'PUT' and order_id:
            body = json.loads(body_raw)
            fields = []
            values = []

            if 'status' in body:
                new_status = body['status']
                note = body.get('statusNote', '')
                # Дописываем в историю
                cur.execute(f"SELECT status_history FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                hist_row = cur.fetchone()
                history = hist_row[0] if hist_row and hist_row[0] else []
                if isinstance(history, str):
                    history = json.loads(history)
                history.append({'status': new_status, 'date': now_iso(), 'note': note})
                fields.append('status = %s')
                values.append(new_status)
                fields.append('status_history = %s')
                values.append(json.dumps(history, ensure_ascii=False))

                if new_status == 'issued':
                    cur.execute(f"SELECT client_id, total, status FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                    ord_row = cur.fetchone()
                    if ord_row:
                        client_id_ord, total_ord, old_status = ord_row[0], float(ord_row[1]), ord_row[2]
                        # Списываем сумму заказа с баланса только если статус меняется впервые на issued
                        if old_status != 'issued':
                            cur.execute(f"""
                                UPDATE {SCHEMA}.clients
                                SET total_spent = total_spent + %s, balance = balance - %s
                                WHERE id = %s
                            """, (total_ord, total_ord, client_id_ord))
                            cur.execute(f"""
                                INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                                VALUES (%s, %s, %s, 'remove', %s, 'Выдача заказа', %s)
                            """, (str(uuid.uuid4()), client_id_ord, date.today().isoformat(), total_ord, order_id))

            if 'prepaid' in body:
                new_prepaid = float(body['prepaid'])
                cur.execute(f"SELECT prepaid, client_id FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                old_row = cur.fetchone()
                if old_row:
                    diff = new_prepaid - float(old_row[0])
                    fields.append('prepaid = %s')
                    values.append(new_prepaid)
                    cur.execute(f"UPDATE {SCHEMA}.clients SET balance = balance + %s WHERE id = %s", (diff, old_row[1]))
                    if diff != 0:
                        cur.execute(f"""
                            INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                            VALUES (%s,%s,%s,'prepaid',%s,'Изменение предоплаты',%s)
                        """, (str(uuid.uuid4()), old_row[1], date.today().isoformat(), abs(diff), order_id))

            if 'note' in body:
                fields.append('note = %s')
                values.append(body['note'])

            if 'items' in body:
                new_items = body['items']
                new_total = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in new_items)
                fields.append('items = %s')
                values.append(json.dumps(new_items, ensure_ascii=False))
                fields.append('total = %s')
                values.append(new_total)

            if fields:
                values.append(order_id)
                cur.execute(f"UPDATE {SCHEMA}.client_orders SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
                row = cur.fetchone()
                cols = [d[0] for d in cur.description]
                conn.commit()
                if not row:
                    return resp(404, {'error': 'Не найдено'})
                return resp(200, row_to_order(cols, row))
            return resp(400, {'error': 'Нет полей'})

        # GET возвраты
        if method == 'GET' and action == 'returns':
            cur.execute(f"""
                SELECT r.id, r.order_id, r.client_id, r.items, r.amount, r.reason, r.created_at,
                       COALESCE(c.company_name, CONCAT_WS(' ', c.last_name, c.first_name)) as client_name,
                       c.phone as client_phone
                FROM {SCHEMA}.order_returns r
                JOIN {SCHEMA}.clients c ON c.id = r.client_id
                ORDER BY r.created_at DESC
            """)
            rows = []
            for row in cur.fetchall():
                items = row[3] if isinstance(row[3], list) else json.loads(row[3])
                rows.append({
                    'id': row[0], 'orderId': row[1], 'clientId': row[2],
                    'items': items, 'amount': float(row[4]),
                    'reason': row[5], 'createdAt': str(row[6]),
                    'clientName': row[7] or '—', 'clientPhone': row[8] or '',
                })
            return resp(200, rows)

        # POST создать возврат
        if method == 'POST' and action == 'return':
            body = json.loads(body_raw)
            ret_order_id = body.get('orderId')
            ret_items = body.get('items', [])
            reason = body.get('reason', '')

            if not ret_order_id or not ret_items:
                return resp(400, {'error': 'orderId и items обязательны'})

            # Считаем сумму возврата
            amount = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in ret_items)

            # Находим клиента заказа
            cur.execute(f"SELECT client_id FROM {SCHEMA}.client_orders WHERE id = %s", (ret_order_id,))
            ord_row = cur.fetchone()
            if not ord_row:
                return resp(404, {'error': 'Заказ не найден'})
            client_id_ret = ord_row[0]

            # Сохраняем возврат
            ret_id = str(uuid.uuid4())
            cur.execute(f"""
                INSERT INTO {SCHEMA}.order_returns (id, order_id, client_id, items, amount, reason)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (ret_id, ret_order_id, client_id_ret, json.dumps(ret_items, ensure_ascii=False), amount, reason))

            # Возвращаем деньги на баланс клиента
            cur.execute(f"UPDATE {SCHEMA}.clients SET balance = balance + %s WHERE id = %s", (amount, client_id_ret))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                VALUES (%s, %s, %s, 'add', %s, %s, %s)
            """, (str(uuid.uuid4()), client_id_ret, date.today().isoformat(), amount,
                  f'Возврат позиции: {", ".join(i.get("name","") for i in ret_items)}', ret_order_id))

            conn.commit()
            return resp(201, {'id': ret_id, 'amount': amount, 'clientId': client_id_ret})

        # DELETE заказ
        if method == 'DELETE' and order_id:
            cur.execute(f"SELECT client_id, total, status FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Заказ не найден'})
            client_id_del, total_del, status_del = row[0], float(row[1]), row[2]
            cur.execute(f"DELETE FROM {SCHEMA}.balance_entries WHERE order_id = %s", (order_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
            cur.execute(f"UPDATE {SCHEMA}.clients SET total_orders = GREATEST(total_orders - 1, 0) WHERE id = %s", (client_id_del,))
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()