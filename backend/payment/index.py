import json
import os
import hashlib
import time
import urllib.request
import psycopg2
from datetime import date, timedelta, datetime, timezone

SCHEMA = 't_p26023881_auto_parts_inventory'
ADMIN_PHONE = '+79680066666'

PLANS = {
    1:  {'days': 30,  'amount': 65000,  'label': '1 месяц'},
    3:  {'days': 90,  'amount': 175500, 'label': '3 месяца'},
    6:  {'days': 180, 'amount': 331500, 'label': '6 месяцев'},
    12: {'days': 365, 'amount': 624000, 'label': '1 год'},
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    }

def resp(status, body):
    return {
        'statusCode': status,
        'headers': {**cors_headers(), 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }

def tbank_sign(params: dict, secret_key: str) -> str:
    filtered = {k: v for k, v in params.items() if k not in ('Shops', 'Receipt', 'DATA', 'Token')}
    filtered['Password'] = secret_key
    sorted_values = [str(filtered[k]) for k in sorted(filtered.keys())]
    return hashlib.sha256(''.join(sorted_values).encode('utf-8')).hexdigest()

def get_user_by_token(cur, token: str):
    now = datetime.now(timezone.utc)
    cur.execute(f"""
        SELECT u.id, u.email, u.name, u.paid_until, u.free_until, u.is_admin, u.phone
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
    """, (token, now))
    return cur.fetchone()

def extend_subscription(cur, conn, user_id: str, days: int):
    cur.execute(f"SELECT paid_until FROM {SCHEMA}.users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    today = date.today()
    current_paid = row[0]
    base = current_paid if (current_paid and current_paid >= today) else today
    new_paid_until = base + timedelta(days=days)
    cur.execute(f"UPDATE {SCHEMA}.users SET paid_until = %s WHERE id = %s", (new_paid_until, user_id))
    conn.commit()
    return new_paid_until

def handler(event: dict, context) -> dict:
    """Платежи Т-Банк: создание платежа, webhook, статус подписки, продление из админки"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    TERMINAL_ID = os.environ.get('TBANK_TERMINAL_ID', '')
    SECRET_KEY = os.environ.get('TBANK_SECRET_KEY', '')

    # ── GET SUBSCRIPTION STATUS ───────────────────────────
    if method == 'GET' and action == 'status':
        token = (event.get('headers') or {}).get('X-Session-Token', '')
        if not token:
            return resp(401, {'error': 'Не авторизован'})

        conn = get_conn()
        cur = conn.cursor()
        row = get_user_by_token(cur, token)
        if not row:
            return resp(401, {'error': 'Сессия истекла'})

        paid_until = row[3]
        free_until = row[4]
        is_admin = row[5]
        today = date.today()

        active = is_admin or (free_until and free_until >= today) or (paid_until and paid_until >= today)

        return resp(200, {
            'active': bool(active),
            'paid_until': str(paid_until) if paid_until else None,
            'free_until': str(free_until) if free_until else None,
            'is_admin': is_admin,
        })

    # ── CREATE PAYMENT ────────────────────────────────────
    if method == 'POST' and action == 'create':
        token = (event.get('headers') or {}).get('X-Session-Token', '')
        if not token:
            return resp(401, {'error': 'Не авторизован'})

        body = json.loads(event.get('body') or '{}')
        months = int(body.get('months', 1))
        plan = PLANS.get(months, PLANS[1])

        conn = get_conn()
        cur = conn.cursor()
        row = get_user_by_token(cur, token)
        if not row:
            return resp(401, {'error': 'Сессия истекла'})

        user_id = str(row[0])
        user_email = str(row[1])
        order_id = f"sub_{user_id[:8]}_{int(time.time())}_{months}m"

        params = {
            'TerminalKey': TERMINAL_ID,
            'Amount': plan['amount'],
            'OrderId': order_id,
            'Description': f"Подписка Долговик — {plan['label']}",
            'DATA': json.dumps({'user_id': user_id, 'days': plan['days']}),
        }
        params['Token'] = tbank_sign(params, SECRET_KEY)

        req_data = json.dumps(params).encode('utf-8')
        tbank_req = urllib.request.Request(
            'https://securepay.tinkoff.ru/v2/Init',
            data=req_data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(tbank_req) as tbank_resp:
            tbank_result = json.loads(tbank_resp.read().decode('utf-8'))

        if not tbank_result.get('Success'):
            return resp(502, {'error': tbank_result.get('Message', 'Ошибка Т-Банк')})

        return resp(200, {'url': tbank_result['PaymentURL'], 'orderId': order_id})

    # ── WEBHOOK FROM TBANK ────────────────────────────────
    if method == 'POST' and action == 'webhook':
        body = json.loads(event.get('body') or '{}')

        expected = tbank_sign(body, SECRET_KEY)
        if body.get('Token') != expected:
            return resp(400, {'error': 'Неверная подпись'})

        if body.get('Status', '') != 'CONFIRMED':
            return resp(200, {'ok': True})

        data_raw = body.get('DATA', '{}')
        data = json.loads(data_raw) if isinstance(data_raw, str) else data_raw
        user_id = data.get('user_id')
        days = int(data.get('days', 30))

        if not user_id:
            return resp(400, {'error': 'user_id не найден'})

        conn = get_conn()
        cur = conn.cursor()
        new_date = extend_subscription(cur, conn, user_id, days)
        if not new_date:
            return resp(404, {'error': 'Пользователь не найден'})

        return resp(200, {'ok': True, 'paid_until': str(new_date)})

    # ── ADMIN: EXTEND SUBSCRIPTION ────────────────────────
    if method == 'POST' and action == 'admin_extend':
        token = (event.get('headers') or {}).get('X-Session-Token', '')
        if not token:
            return resp(401, {'error': 'Не авторизован'})

        conn = get_conn()
        cur = conn.cursor()
        caller = get_user_by_token(cur, token)
        if not caller:
            return resp(401, {'error': 'Сессия истекла'})

        caller_phone = str(caller[6] or '').replace(' ', '').replace('-', '')
        if caller_phone != ADMIN_PHONE and not caller[5]:
            return resp(403, {'error': 'Доступ запрещён'})

        body = json.loads(event.get('body') or '{}')
        user_id = body.get('userId')
        months = int(body.get('months', 1))
        plan = PLANS.get(months, PLANS[1])

        if not user_id:
            return resp(400, {'error': 'userId обязателен'})

        new_date = extend_subscription(cur, conn, user_id, plan['days'])
        if not new_date:
            return resp(404, {'error': 'Пользователь не найден'})

        return resp(200, {'ok': True, 'paid_until': str(new_date)})

    # ── GET PLANS ─────────────────────────────────────────
    if method == 'GET' and action == 'plans':
        return resp(200, {'plans': [
            {'months': k, 'days': v['days'], 'amount': v['amount'],
             'price': v['amount'] // 100, 'label': v['label']}
            for k, v in PLANS.items()
        ]})

    return resp(404, {'error': 'Неизвестное действие'})
