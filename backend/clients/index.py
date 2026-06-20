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

def row_to_client(cols, row):
    d = dict(zip(cols, row))
    return {
        'id': d['id'],
        'type': d['client_type'],
        'firstName': d['first_name'],
        'lastName': d['last_name'],
        'middleName': d['middle_name'],
        'companyName': d['company_name'],
        'phone': d['phone'],
        'email': d['email'],
        'city': d['city'],
        'address': d['address'],
        'note': d['note'],
        'balance': float(d['balance']),
        'totalOrders': d['total_orders'],
        'totalSpent': float(d['total_spent']),
        'isDeleted': d['is_removed'],
        'createdAt': str(d['created_at'])[:10],
        'vins': list(d.get('vins') or []),
    }

def handler(event: dict, context) -> dict:
    """CRUD для клиентов с привязкой к пользователю"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    qs = event.get('queryStringParameters') or {}
    path_parts = [p for p in path.split('/') if p]
    client_id = qs.get('id') or (path_parts[-1] if path_parts and path_parts[-1] not in ('clients',) else None)
    token = (event.get('headers') or {}).get('X-Session-Token', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return resp(401, {'error': 'Не авторизован'})

        if method == 'GET' and not client_id:
            cur.execute(f"""
                SELECT id, client_type, first_name, last_name, middle_name, company_name,
                       phone, email, city, address, note, balance, total_orders, total_spent,
                       is_removed, created_at, vins
                FROM {SCHEMA}.clients
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            cols = [d[0] for d in cur.description]
            rows = [row_to_client(cols, row) for row in cur.fetchall()]
            return resp(200, rows)

        if method == 'GET' and client_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.clients WHERE id = %s AND user_id = %s", (client_id, user_id))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            return resp(200, row_to_client(cols, row))

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            cid = str(uuid.uuid4())
            vins = body.get('vins', [])
            cur.execute(f"""
                INSERT INTO {SCHEMA}.clients
                  (id, client_type, first_name, last_name, middle_name, company_name,
                   phone, email, city, address, note, balance, total_orders, total_spent,
                   is_removed, created_at, vins, user_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0,0,0,false,%s,%s,%s)
                RETURNING *
            """, (
                cid,
                body.get('type', 'individual'),
                body.get('firstName', ''),
                body.get('lastName'),
                body.get('middleName'),
                body.get('companyName'),
                body.get('phone', ''),
                body.get('email'),
                body.get('city'),
                body.get('address'),
                body.get('note'),
                date.today().isoformat(),
                vins,
                user_id,
            ))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(201, row_to_client(cols, row))

        if method == 'PUT' and client_id:
            body = json.loads(event.get('body') or '{}')
            fields = []
            values = []
            mapping = {
                'type': ('client_type', str),
                'firstName': ('first_name', str),
                'lastName': ('last_name', lambda x: x),
                'middleName': ('middle_name', lambda x: x),
                'companyName': ('company_name', lambda x: x),
                'phone': ('phone', str),
                'email': ('email', lambda x: x),
                'city': ('city', lambda x: x),
                'address': ('address', lambda x: x),
                'note': ('note', lambda x: x),
                'balance': ('balance', float),
                'totalOrders': ('total_orders', int),
                'totalSpent': ('total_spent', float),
                'isDeleted': ('is_removed', bool),
            }
            for key, (col, cast) in mapping.items():
                if key in body:
                    fields.append(f"{col} = %s")
                    values.append(cast(body[key]) if body[key] is not None else None)
            if 'vins' in body:
                fields.append('vins = %s')
                values.append(list(body['vins']))
            if not fields:
                return resp(400, {'error': 'Нет полей для обновления'})
            values.append(client_id)
            values.append(user_id)
            cur.execute(f"UPDATE {SCHEMA}.clients SET {', '.join(fields)} WHERE id = %s AND user_id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Не найдено'})
            cols = [d[0] for d in cur.description]
            conn.commit()
            return resp(200, row_to_client(cols, row))

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()
