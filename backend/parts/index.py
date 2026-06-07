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

def handler(event: dict, context) -> dict:
    """CRUD для запчастей на складе"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    parts_path = path.split('/')
    part_id = parts_path[-1] if len(parts_path) > 1 and parts_path[-1] not in ('', 'parts') else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET' and not part_id:
            cur.execute(f"""
                SELECT id, article, name, brand, category, quantity, min_quantity,
                       price, location, analogs, oem_article, barcode, last_movement, created_at
                FROM {SCHEMA}.parts
                ORDER BY name, article
            """)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, rows)

        if method == 'GET' and part_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.parts WHERE id = %s", (part_id,))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            return resp(200, dict(zip(cols, row)))

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            pid = str(uuid.uuid4())
            cur.execute(f"""
                INSERT INTO {SCHEMA}.parts
                  (id, article, name, brand, category, quantity, min_quantity, price, location, analogs, oem_article, barcode, last_movement)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (
                pid,
                body.get('article', ''),
                body.get('name', ''),
                body.get('brand', ''),
                body.get('category', 'Расходники'),
                int(body.get('quantity', 0)),
                int(body.get('minQuantity', 0)),
                float(body.get('price', 0)),
                body.get('location', ''),
                body.get('analogs', []),
                body.get('oemArticle'),
                body.get('barcode'),
                date.today().isoformat(),
            ))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(201, dict(zip(cols, row)))

        if method == 'PUT' and part_id:
            body = json.loads(event.get('body') or '{}')
            cur.execute(f"""
                UPDATE {SCHEMA}.parts SET
                  article = %s, name = %s, brand = %s, category = %s,
                  quantity = %s, min_quantity = %s, price = %s, location = %s,
                  analogs = %s, oem_article = %s, barcode = %s, last_movement = %s
                WHERE id = %s
                RETURNING *
            """, (
                body.get('article', ''),
                body.get('name', ''),
                body.get('brand', ''),
                body.get('category', 'Расходники'),
                int(body.get('quantity', 0)),
                int(body.get('minQuantity', 0)),
                float(body.get('price', 0)),
                body.get('location', ''),
                body.get('analogs', []),
                body.get('oemArticle'),
                body.get('barcode'),
                date.today().isoformat(),
                part_id,
            ))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(200, dict(zip(cols, row)))

        if method == 'DELETE' and part_id:
            cur.execute(f"DELETE FROM {SCHEMA}.parts WHERE id = %s RETURNING id", (part_id,))
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            return resp(200, {'ok': True})

        # Bulk import
        if method == 'POST' and 'import' in path:
            body = json.loads(event.get('body') or '{}')
            rows_data = body.get('parts', [])
            count = 0
            for p in rows_data:
                pid = str(uuid.uuid4())
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.parts
                      (id, article, name, brand, category, quantity, min_quantity, price, location, analogs, last_movement)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    pid,
                    p.get('article', ''),
                    p.get('name', ''),
                    p.get('brand', ''),
                    p.get('category', 'Расходники'),
                    int(p.get('quantity', 0)),
                    int(p.get('minQuantity', 0)),
                    float(p.get('price', 0)),
                    p.get('location', ''),
                    [],
                    date.today().isoformat(),
                ))
                count += 1
            conn.commit()
            return resp(200, {'imported': count})

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()
