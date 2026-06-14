import json
import os
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime, timezone

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

SCHEMA = os.environ.get('DB_SCHEMA', 'public')


def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False)}


def get_user_tokens(session_token: str):
    """Получить API-токены поставщиков из настроек пользователя по сессии"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        now = datetime.now(timezone.utc)
        cur.execute(f"""
            SELECT u.id FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
        """, (session_token, now))
        row = cur.fetchone()
        if not row:
            return None
        cur.execute(f"SELECT key, value FROM {SCHEMA}.company_settings WHERE key LIKE '%_token'")
        rows = cur.fetchall()
        return {r[0]: r[1] for r in rows if r[1]}
    finally:
        conn.close()


def search_avtorus(article: str, token: str):
    """Поиск по артикулу через API Авторусь"""
    url = f"https://public.api.avtorus.ru/api/v1/product/ProductOffersByArticle?article={urllib.parse.quote(article)}"
    request = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(request, timeout=10) as r:
            data = json.loads(r.read())
            items = data if isinstance(data, list) else data.get('data', data.get('items', []))
            results = []
            for item in items[:20]:
                results.append({
                    'source': 'Авторусь',
                    'article': item.get('article', ''),
                    'brand': item.get('brand', item.get('brandName', '')),
                    'name': item.get('name', item.get('description', '')),
                    'price': float(item.get('price', item.get('retailPrice', 0)) or 0),
                    'quantity': int(item.get('quantity', item.get('count', 0)) or 0),
                    'delivery_days': str(item.get('deliveryDays', item.get('delivery', '')) or ''),
                    'warehouse': str(item.get('warehouse', item.get('warehouseName', '')) or ''),
                })
            return results
    except Exception:
        return []


def handler(event: dict, context) -> dict:
    """Поиск запчастей у поставщиков по API-токенам пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    session_token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not session_token:
        return resp(401, {'error': 'Не авторизован'})

    params = event.get('queryStringParameters') or {}
    article = params.get('article', '').strip()
    if not article:
        return resp(400, {'error': 'Укажите артикул'})

    tokens = get_user_tokens(session_token)
    if tokens is None:
        return resp(401, {'error': 'Сессия истекла'})

    results = []

    if tokens.get('avtorus_token'):
        results += search_avtorus(article, tokens['avtorus_token'])

    return resp(200, {'results': results, 'connected': list(tokens.keys())})
