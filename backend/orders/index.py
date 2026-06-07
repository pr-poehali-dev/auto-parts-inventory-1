import json
import os
import uuid
from datetime import date
import psycopg2

SCHEMA = 't_p26023881_auto_parts_inventory'

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
    return {
        'id': d['id'],
        'clientId': d['client_id'],
        'date': str(d['date']),
        'status': d['status'],
        'items': d['items'] if isinstance(d['items'], list) else json.loads(d['items']),
        'total': float(d['total']),
        'prepaid': float(d['prepaid']),
        'note': d.get('note'),
    }

def handler(event: dict, context) -> dict:
    """CRUD для заказов и баланса клиентов"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    qs = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /orders?clientId=xxx
        if method == 'GET' and 'balance' not in path:
            client_id = qs.get('clientId')
            if client_id:
                cur.execute(f"""
                    SELECT id, client_id, date, status, items, total, prepaid, note
                    FROM {SCHEMA}.client_orders
                    WHERE client_id = %s
                    ORDER BY date DESC, created_at DESC
                """, (client_id,))
            else:
                cur.execute(f"""
                    SELECT id, client_id, date, status, items, total, prepaid, note
                    FROM {SCHEMA}.client_orders
                    ORDER BY date DESC, created_at DESC
                """)
            cols = [d[0] for d in cur.description]
            rows = [row_to_order(cols, row) for row in cur.fetchall()]
            return resp(200, rows)

        # POST /orders — создать заказ
        if method == 'POST' and 'balance' not in path:
            body = json.loads(event.get('body') or '{}')
            oid = str(uuid.uuid4())
            items = body.get('items', [])
            total = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in items)
            prepaid = float(body.get('prepaid', 0))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.client_orders
                  (id, client_id, date, status, items, total, prepaid, note)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (
                oid,
                body.get('clientId'),
                body.get('date', date.today().isoformat()),
                body.get('status', 'new'),
                json.dumps(items, ensure_ascii=False),
                total,
                prepaid,
                body.get('note'),
            ))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]

            # Обновляем статистику клиента
            cur.execute(f"""
                UPDATE {SCHEMA}.clients
                SET total_orders = total_orders + 1,
                    balance = balance - %s
                WHERE id = %s
            """, (prepaid, body.get('clientId')))

            # Запись в историю баланса если есть предоплата
            if prepaid > 0:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                    VALUES (%s,%s,%s,'prepaid',%s,'Предоплата по заказу',%s)
                """, (str(uuid.uuid4()), body.get('clientId'), date.today().isoformat(), prepaid, oid))

            conn.commit()
            return resp(201, row_to_order(cols, row))

        # PUT /orders/{id} — обновить заказ
        if method == 'PUT' and 'balance' not in path:
            path_parts = [p for p in path.split('/') if p]
            order_id = path_parts[-1]
            body = json.loads(event.get('body') or '{}')

            fields = []
            values = []
            if 'status' in body:
                fields.append('status = %s')
                values.append(body['status'])
                # Если выполнен — обновляем total_spent клиента
                if body['status'] == 'done':
                    cur.execute(f"SELECT client_id, total FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                    ord_row = cur.fetchone()
                    if ord_row:
                        cur.execute(f"""
                            UPDATE {SCHEMA}.clients SET total_spent = total_spent + %s WHERE id = %s
                        """, (float(ord_row[1]), ord_row[0]))
            if 'prepaid' in body:
                new_prepaid = float(body['prepaid'])
                cur.execute(f"SELECT prepaid, client_id FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                old_row = cur.fetchone()
                if old_row:
                    diff = new_prepaid - float(old_row[0])
                    fields.append('prepaid = %s')
                    values.append(new_prepaid)
                    cur.execute(f"UPDATE {SCHEMA}.clients SET balance = balance - %s WHERE id = %s", (diff, old_row[1]))
                    if diff != 0:
                        cur.execute(f"""
                            INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note, order_id)
                            VALUES (%s,%s,%s,'prepaid',%s,'Изменение предоплаты',%s)
                        """, (str(uuid.uuid4()), old_row[1], date.today().isoformat(), abs(diff), order_id))
            if 'note' in body:
                fields.append('note = %s')
                values.append(body['note'])

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

        # GET /orders/balance?clientId=xxx — история баланса
        if method == 'GET' and 'balance' in path:
            client_id = qs.get('clientId')
            cur.execute(f"""
                SELECT id, client_id, date, entry_type, amount, note, order_id
                FROM {SCHEMA}.balance_entries
                WHERE client_id = %s
                ORDER BY created_at DESC
            """, (client_id,))
            cols = [d[0] for d in cur.description]
            rows = []
            for row in cur.fetchall():
                d = dict(zip(cols, row))
                rows.append({
                    'id': d['id'],
                    'date': str(d['date']),
                    'type': d['entry_type'],
                    'amount': float(d['amount']),
                    'note': d['note'],
                    'orderId': d['order_id'],
                })
            return resp(200, rows)

        # POST /orders/balance — пополнить/списать баланс
        if method == 'POST' and 'balance' in path:
            body = json.loads(event.get('body') or '{}')
            client_id = body.get('clientId')
            entry_type = body.get('type', 'add')
            amount = float(body.get('amount', 0))
            sign = 1 if entry_type == 'add' else -1
            cur.execute(f"UPDATE {SCHEMA}.clients SET balance = balance + %s WHERE id = %s", (sign * amount, client_id))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.balance_entries (id, client_id, date, entry_type, amount, note)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (str(uuid.uuid4()), client_id, date.today().isoformat(), entry_type, amount, body.get('note')))
            cur.execute(f"SELECT balance FROM {SCHEMA}.clients WHERE id = %s", (client_id,))
            new_balance = float(cur.fetchone()[0])
            conn.commit()
            return resp(200, {'balance': new_balance})

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()
