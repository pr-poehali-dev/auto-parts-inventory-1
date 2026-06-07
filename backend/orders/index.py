import json
import os
import uuid
from datetime import datetime, timezone
from datetime import date
import psycopg2

SCHEMA = 't_p26023881_auto_parts_inventory'

# Допустимые статусы и их русские названия
STATUSES = ['new', 'ordered', 'in_stock', 'issued', 'done', 'cancelled']

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
        if method == 'GET' and action != 'balance':
            if client_id_qs:
                cur.execute(f"""
                    SELECT id, client_id, date, status, status_history, items, total, prepaid, note
                    FROM {SCHEMA}.client_orders
                    WHERE client_id = %s
                    ORDER BY date DESC, created_at DESC
                """, (client_id_qs,))
            else:
                cur.execute(f"""
                    SELECT id, client_id, date, status, status_history, items, total, prepaid, note
                    FROM {SCHEMA}.client_orders
                    ORDER BY date DESC, created_at DESC
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
        if method == 'POST' and action != 'balance':
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
                SET total_orders = total_orders + 1, balance = balance + %s - %s
                WHERE id = %s
            """, (prepaid, total, body.get('clientId')))
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

                if new_status == 'done':
                    cur.execute(f"SELECT client_id, total FROM {SCHEMA}.client_orders WHERE id = %s", (order_id,))
                    ord_row = cur.fetchone()
                    if ord_row:
                        cur.execute(f"UPDATE {SCHEMA}.clients SET total_spent = total_spent + %s WHERE id = %s", (float(ord_row[1]), ord_row[0]))

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

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()
