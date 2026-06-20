import json
import os
import uuid
from datetime import date, datetime, timezone
import psycopg2

SCHEMA = 't_p26023881_auto_parts_inventory'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    }

def resp(status, body):
    return {'statusCode': status, 'headers': {**cors_headers(), 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False, default=str)}

def get_user_id(cur, token):
    if not token:
        return None
    now = datetime.now(timezone.utc)
    cur.execute(f"""
        SELECT u.id FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
    """, (token, now))
    row = cur.fetchone()
    return str(row[0]) if row else None

def handler(event: dict, context) -> dict:
    """CRUD для запчастей на складе с привязкой к пользователю"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    body_raw = event.get('body') or '{}'
    token = (event.get('headers') or {}).get('X-Session-Token', '')

    part_id = qs.get('id')
    action = qs.get('action', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return resp(401, {'error': 'Не авторизован'})

        if method == 'GET' and not part_id:
            cur.execute(f"""
                SELECT id, article, name, brand, category, quantity, min_quantity,
                       price, cost_price, location, analogs, oem_article, barcode, last_movement, created_at
                FROM {SCHEMA}.parts
                WHERE user_id = %s
                ORDER BY name, article
            """, (user_id,))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, rows)

        if method == 'GET' and part_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.parts WHERE id = %s AND user_id = %s", (part_id, user_id))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            return resp(200, dict(zip(cols, row)))

        if method == 'POST' and action == 'import':
            body = json.loads(body_raw)
            rows_data = body.get('parts', [])
            count = 0
            for p in rows_data:
                pid = str(uuid.uuid4())
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.parts
                      (id, article, name, brand, category, quantity, min_quantity, price, cost_price, location, analogs, last_movement, user_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    pid, p.get('article', ''), p.get('name', ''), p.get('brand', ''),
                    p.get('category', 'Расходники'), int(p.get('quantity', 0)),
                    int(p.get('minQuantity', 0)), float(p.get('price', 0)),
                    float(p.get('costPrice', 0)),
                    p.get('location', ''), [], date.today().isoformat(), user_id,
                ))
                count += 1
            conn.commit()
            return resp(200, {'imported': count})

        if method == 'POST':
            body = json.loads(body_raw)
            pid = str(uuid.uuid4())
            cur.execute(f"""
                INSERT INTO {SCHEMA}.parts
                  (id, article, name, brand, category, quantity, min_quantity, price, cost_price, location, analogs, oem_article, barcode, last_movement, user_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (
                pid, body.get('article', ''), body.get('name', ''), body.get('brand', ''),
                body.get('category', 'Расходники'), int(body.get('quantity', 0)),
                int(body.get('minQuantity', 0)), float(body.get('price', 0)),
                float(body.get('costPrice', 0)),
                body.get('location', ''), body.get('analogs', []),
                body.get('oemArticle'), body.get('barcode'), date.today().isoformat(), user_id,
            ))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(201, dict(zip(cols, row)))

        if method == 'PUT' and part_id:
            body = json.loads(body_raw)
            cur.execute(f"""
                UPDATE {SCHEMA}.parts SET
                  article = %s, name = %s, brand = %s, category = %s,
                  quantity = %s, min_quantity = %s, price = %s, cost_price = %s, location = %s,
                  analogs = %s, oem_article = %s, barcode = %s, last_movement = %s
                WHERE id = %s AND user_id = %s
                RETURNING *
            """, (
                body.get('article', ''), body.get('name', ''), body.get('brand', ''),
                body.get('category', 'Расходники'), int(body.get('quantity', 0)),
                int(body.get('minQuantity', 0)), float(body.get('price', 0)),
                float(body.get('costPrice', 0)),
                body.get('location', ''), body.get('analogs', []),
                body.get('oemArticle'), body.get('barcode'),
                date.today().isoformat(), part_id, user_id,
            ))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(200, dict(zip(cols, row)))

        if method == 'DELETE' and part_id:
            cur.execute(f"DELETE FROM {SCHEMA}.parts WHERE id = %s AND user_id = %s RETURNING id", (part_id, user_id))
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            return resp(200, {'ok': True})

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()
