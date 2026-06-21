import json
import os
import psycopg2
from datetime import datetime, timezone

SCHEMA = 't_p26023881_auto_parts_inventory'
ADMIN_PHONE = '+79680066666'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    }

def resp(status, body):
    return {
        'statusCode': status,
        'headers': {**cors_headers(), 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }

def get_admin_user(cur, token):
    """Проверяет токен и возвращает пользователя, если он админ"""
    if not token:
        return None
    now = datetime.now(timezone.utc)
    cur.execute(f"""
        SELECT u.id, u.phone, u.email, u.name FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
    """, (token, now))
    row = cur.fetchone()
    if not row:
        return None
    phone = str(row[1] or '').replace(' ', '').replace('-', '')
    if phone != ADMIN_PHONE:
        return None
    return {'id': str(row[0]), 'phone': phone, 'email': row[2], 'name': row[3]}

def handler(event: dict, context) -> dict:
    """Админ-панель: статистика, пользователи, заказы, клиенты"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'stats')
    token = (event.get('headers') or {}).get('X-Session-Token', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'POST' and action == 'log_visit':
            body = json.loads(event.get('body') or '{}')
            page = (body.get('page') or '/')[:100]
            user_id = body.get('user_id')
            ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or \
                 (event.get('headers') or {}).get('X-Forwarded-For', '').split(',')[0].strip() or None
            ua = ((event.get('headers') or {}).get('User-Agent') or '')[:500]
            cur.execute(f"INSERT INTO {SCHEMA}.page_visits (page, user_id, ip, user_agent) VALUES (%s, %s, %s, %s)",
                        (page, user_id or None, ip, ua))
            conn.commit()
            return resp(200, {'ok': True})

        admin = get_admin_user(cur, token)
        if not admin:
            return resp(403, {'error': 'Доступ запрещён'})

        # ── STATS ─────────────────────────────────────────────
        if method == 'GET' and action == 'stats':
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE is_active = TRUE")
            total_users = cur.fetchone()[0]

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.clients")
            total_clients = cur.fetchone()[0]

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.client_orders")
            total_orders = cur.fetchone()[0]

            cur.execute(f"SELECT COALESCE(SUM(total), 0) FROM {SCHEMA}.client_orders WHERE status != 'cancelled'")
            total_revenue = float(cur.fetchone()[0])

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.client_orders WHERE status IN ('new', 'ordered', 'in_stock')")
            active_orders = cur.fetchone()[0]

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.parts")
            total_parts = cur.fetchone()[0]

            cur.execute(f"""
                SELECT DATE(created_at), COUNT(*) FROM {SCHEMA}.client_orders
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at) ORDER BY DATE(created_at)
            """)
            orders_by_day = [{'date': str(r[0]), 'count': r[1]} for r in cur.fetchall()]

            return resp(200, {
                'totalUsers': total_users,
                'totalClients': total_clients,
                'totalOrders': total_orders,
                'totalRevenue': total_revenue,
                'activeOrders': active_orders,
                'totalParts': total_parts,
                'ordersByDay': orders_by_day,
            })

        # ── USERS ─────────────────────────────────────────────
        if method == 'GET' and action == 'users':
            cur.execute(f"""
                SELECT u.id, u.email, u.phone, u.name, u.is_active, u.created_at,
                       COUNT(s.id) as session_count,
                       MAX(s.created_at) as last_login,
                       u.paid_until, u.free_until
                FROM {SCHEMA}.users u
                LEFT JOIN {SCHEMA}.sessions s ON s.user_id = u.id
                GROUP BY u.id ORDER BY u.created_at DESC
            """)
            cols = ['id', 'email', 'phone', 'name', 'isActive', 'createdAt', 'sessionCount', 'lastLogin', 'paidUntil', 'freeUntil']
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            for r in rows:
                r['id'] = str(r['id'])
                r['isAdmin'] = str(r['phone'] or '').replace(' ', '').replace('-', '') == ADMIN_PHONE
                r['paidUntil'] = str(r['paidUntil']) if r['paidUntil'] else None
                r['freeUntil'] = str(r['freeUntil']) if r['freeUntil'] else None
            return resp(200, rows)

        # ── TOGGLE USER ACTIVE ─────────────────────────────────
        if method == 'POST' and action == 'toggle_user':
            body = json.loads(event.get('body') or '{}')
            user_id = body.get('userId')
            if not user_id:
                return resp(400, {'error': 'userId обязателен'})
            cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Пользователь не найден'})
            if str(row[0] or '').replace(' ', '').replace('-', '') == ADMIN_PHONE:
                return resp(400, {'error': 'Нельзя деактивировать администратора'})
            cur.execute(f"""
                UPDATE {SCHEMA}.users SET is_active = NOT is_active WHERE id = %s
                RETURNING id, is_active
            """, (user_id,))
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'id': str(row[0]), 'isActive': row[1]})

        # ── RECENT ORDERS ─────────────────────────────────────
        if method == 'GET' and action == 'orders':
            limit = int(qs.get('limit', '50'))
            cur.execute(f"""
                SELECT o.id, o.date, o.status, o.total, o.created_at,
                       c.id as client_id,
                       COALESCE(c.company_name, CONCAT_WS(' ', c.last_name, c.first_name)) as client_name,
                       c.phone as client_phone
                FROM {SCHEMA}.client_orders o
                LEFT JOIN {SCHEMA}.clients c ON c.id = o.client_id
                ORDER BY o.created_at DESC LIMIT %s
            """, (limit,))
            cols = ['id', 'date', 'status', 'total', 'createdAt', 'clientId', 'clientName', 'clientPhone']
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, rows)

        # ── VISITS ────────────────────────────────────────────
        if method == 'GET' and action == 'visits':
            period = qs.get('period', 'day')
            if period == 'day':
                interval = '1 day'
                trunc = 'hour'
            elif period == 'week':
                interval = '7 days'
                trunc = 'day'
            else:
                interval = '30 days'
                trunc = 'day'

            cur.execute(f"""
                SELECT DATE_TRUNC(%s, visited_at) as t, COUNT(*) as visits, COUNT(DISTINCT ip) as unique_visitors
                FROM {SCHEMA}.page_visits
                WHERE visited_at >= NOW() - INTERVAL '{interval}'
                GROUP BY t ORDER BY t
            """, (trunc,))
            by_time = [{'time': str(r[0]), 'visits': r[1], 'unique': r[2]} for r in cur.fetchall()]

            cur.execute(f"""
                SELECT page, COUNT(*) as cnt FROM {SCHEMA}.page_visits
                WHERE visited_at >= NOW() - INTERVAL '{interval}'
                GROUP BY page ORDER BY cnt DESC LIMIT 10
            """)
            by_page = [{'page': r[0], 'count': r[1]} for r in cur.fetchall()]

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.page_visits WHERE visited_at >= DATE_TRUNC('day', NOW() + INTERVAL '3 hours') - INTERVAL '3 hours'")
            today = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.page_visits WHERE visited_at >= NOW() - INTERVAL '7 days'")
            week = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.page_visits WHERE visited_at >= NOW() - INTERVAL '30 days'")
            month = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(DISTINCT ip) FROM {SCHEMA}.page_visits WHERE visited_at >= DATE_TRUNC('day', NOW() + INTERVAL '3 hours') - INTERVAL '3 hours'")
            today_uniq = cur.fetchone()[0]

            return resp(200, {
                'byTime': by_time,
                'byPage': by_page,
                'totals': {'today': today, 'week': week, 'month': month, 'todayUnique': today_uniq},
            })

        # ── LOG VISIT (POST) ───────────────────────────────────
        if method == 'POST' and action == 'log_visit':
            body = json.loads(event.get('body') or '{}')
            page = (body.get('page') or '/')[:100]
            user_id = body.get('user_id')
            ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or \
                 (event.get('headers') or {}).get('X-Forwarded-For', '').split(',')[0].strip() or None
            ua = ((event.get('headers') or {}).get('User-Agent') or '')[:500]
            cur.execute(f"""
                INSERT INTO {SCHEMA}.page_visits (page, user_id, ip, user_agent)
                VALUES (%s, %s, %s, %s)
            """, (page, user_id or None, ip, ua))
            conn.commit()
            return resp(200, {'ok': True})

        # ── DB INFO ───────────────────────────────────────────
        if method == 'GET' and action == 'dbinfo':
            cur.execute(f"""
                SELECT relname as table_name, n_live_tup as row_count
                FROM pg_stat_user_tables
                WHERE schemaname = %s
                ORDER BY n_live_tup DESC
            """, (SCHEMA,))
            tables = [{'table': r[0], 'rows': r[1]} for r in cur.fetchall()]
            return resp(200, {'tables': tables})

        return resp(400, {'error': 'Неизвестное действие'})

    finally:
        cur.close()
        conn.close()