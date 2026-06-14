import json
import os
import urllib.request
import urllib.parse
import urllib.error
import psycopg2
from datetime import datetime, timezone

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

SCHEMA = os.environ.get('DB_SCHEMA', 't_p26023881_auto_parts_inventory')

SUPPLIER_KEYS = [
    'exist_login', 'exist_password',
    'rossko_key1', 'rossko_key2',
    'avtorus_token', 'emex_login', 'emex_password', 'autodoc_token', 'armtek_token',
]


def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False)}


def get_user_credentials(session_token: str):
    """Получить учётные данные поставщиков из настроек по сессии"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        now = datetime.now(timezone.utc)
        cur.execute(f"""
            SELECT u.id FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
        """, (session_token, now))
        if not cur.fetchone():
            return None
        keys_str = ', '.join(f"'{k}'" for k in SUPPLIER_KEYS)
        cur.execute(f"SELECT key, value FROM {SCHEMA}.company_settings WHERE key IN ({keys_str})")
        rows = cur.fetchall()
        return {r[0]: r[1] for r in rows if r[1]}
    finally:
        conn.close()


def search_avtorus(article: str, token: str) -> list:
    """Поиск по артикулу через API Авторусь (Bearer token)"""
    url = f"https://public.api.avtorus.ru/api/v1/product/ProductOffersByArticle?article={urllib.parse.quote(article)}"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            items = data if isinstance(data, list) else data.get('data', data.get('items', []))
            results = []
            for item in items[:20]:
                results.append({
                    'source': 'Авторусь',
                    'article': str(item.get('article', '')),
                    'brand': str(item.get('brand', item.get('brandName', ''))),
                    'name': str(item.get('name', item.get('description', ''))),
                    'price': float(item.get('price', item.get('retailPrice', 0)) or 0),
                    'quantity': int(item.get('quantity', item.get('count', 0)) or 0),
                    'delivery_days': str(item.get('deliveryDays', item.get('delivery', '')) or ''),
                    'warehouse': str(item.get('warehouse', item.get('warehouseName', '')) or ''),
                })
            return results
    except Exception:
        return []


def search_exist(article: str, login: str, password: str) -> list:
    """Поиск по артикулу через Exist.ru REST API (Basic Auth)"""
    import base64
    encoded = urllib.parse.quote(article)
    url = f"https://api.exist.ru/api/v1/search?q={encoded}&pageSize=20"
    creds = base64.b64encode(f"{login}:{password}".encode()).decode()
    req = urllib.request.Request(url, headers={
        'Authorization': f'Basic {creds}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            print(f"[EXIST] status={r.status} url={url}")
            print(f"[EXIST] response={raw[:500]}")
            data = json.loads(raw)
            items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('result', data.get('offers', []))))
            results = []
            for item in items[:20]:
                results.append({
                    'source': 'Exist.ru',
                    'article': str(item.get('article', item.get('partNumber', item.get('number', '')))),
                    'brand': str(item.get('brand', item.get('brandName', item.get('producer', '')))),
                    'name': str(item.get('name', item.get('description', item.get('title', '')))),
                    'price': float(item.get('price', item.get('retailPrice', item.get('cost', 0))) or 0),
                    'quantity': int(item.get('quantity', item.get('count', item.get('stock', item.get('rest', 0)))) or 0),
                    'delivery_days': str(item.get('deliveryDays', item.get('deliveryTime', item.get('period', ''))) or ''),
                    'warehouse': str(item.get('warehouse', item.get('warehouseName', item.get('storeName', ''))) or ''),
                })
            return results
    except urllib.error.HTTPError as e:
        body = e.read()[:300]
        print(f"[EXIST] HTTPError {e.code}: {body}")
        return []
    except Exception as ex:
        print(f"[EXIST] Exception: {ex}")
        return []


def search_rossko(article: str, key1: str, key2: str) -> list:
    """Поиск по артикулу через Rossko API (KEY1 + KEY2)"""
    url = "https://api.rossko.ru/service/v2.1/GetSearch"
    payload = json.dumps({
        'KEY1': key1,
        'KEY2': key2,
        'text': article,
        'delivery_id': '1',
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            items = data.get('data', {})
            if isinstance(items, dict):
                items = items.get('goods', [])
            if not isinstance(items, list):
                items = []
            results = []
            for item in items[:20]:
                price = 0.0
                stocks = item.get('stocks', [])
                if stocks:
                    price = float(stocks[0].get('price', 0) or 0)
                    qty = int(stocks[0].get('count', 0) or 0)
                    delivery = str(stocks[0].get('delivery', '') or '')
                    warehouse = str(stocks[0].get('address', '') or '')
                else:
                    qty = 0
                    delivery = ''
                    warehouse = ''
                results.append({
                    'source': 'Rossko',
                    'article': str(item.get('partnumber', '')),
                    'brand': str(item.get('brand', '')),
                    'name': str(item.get('name', '')),
                    'price': price,
                    'quantity': qty,
                    'delivery_days': delivery,
                    'warehouse': warehouse,
                })
            return results
    except Exception:
        return []


def search_emex(article: str, login: str, password: str) -> list:
    """Поиск по артикулу через EMEX SOAP API (ws.emex.ru)"""
    soap_body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://tempuri.org/">
  <soap:Body>
    <tns:GetSparePartsForStockist>
      <tns:login>{login}</tns:login>
      <tns:password>{password}</tns:password>
      <tns:detailnum>{article}</tns:detailnum>
      <tns:detailnumType>0</tns:detailnumType>
    </tns:GetSparePartsForStockist>
  </soap:Body>
</soap:Envelope>"""
    url = "http://ws.emex.ru/EmEx_Search.asmx"
    req = urllib.request.Request(
        url,
        data=soap_body.encode('utf-8'),
        headers={
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '"http://tempuri.org/GetSparePartsForStockist"',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode('utf-8')
            print(f"[EMEX] status={r.status} len={len(raw)}")
            print(f"[EMEX] body={raw[:800]}")
            import xml.etree.ElementTree as ET
            root = ET.fromstring(raw)
            ns = {'s': 'http://schemas.xmlsoap.org/soap/envelope/', 't': 'http://tempuri.org/'}
            results = []
            for detail in root.iter('SparePartData'):
                price_str = detail.findtext('PriceRUR') or detail.findtext('Price') or '0'
                qty_str = detail.findtext('Quantity') or detail.findtext('Rest') or '0'
                try:
                    price = float(price_str.replace(',', '.')) if price_str else 0.0
                except Exception:
                    price = 0.0
                try:
                    qty = int(float(qty_str)) if qty_str else 0
                except Exception:
                    qty = 0
                delivery = detail.findtext('DeliveryDays') or detail.findtext('Period') or ''
                results.append({
                    'source': 'EMEX',
                    'article': str(detail.findtext('DetailNum') or article),
                    'brand': str(detail.findtext('MakeName') or detail.findtext('Brand') or ''),
                    'name': str(detail.findtext('DetailNameRusUser') or detail.findtext('Name') or ''),
                    'price': price,
                    'quantity': qty,
                    'delivery_days': str(delivery),
                    'warehouse': str(detail.findtext('StoreName') or detail.findtext('Warehouse') or ''),
                })
            return results[:30]
    except urllib.error.HTTPError as e:
        body = e.read()[:300]
        print(f"[EMEX] HTTPError {e.code}: {body}")
        return []
    except Exception as ex:
        print(f"[EMEX] Exception: {ex}")
        return []


def check_emex(login: str, password: str) -> dict:
    """Проверка подключения к EMEX через TestConnect"""
    soap_body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://tempuri.org/">
  <soap:Body>
    <tns:TestConnect>
      <tns:login>{login}</tns:login>
      <tns:password>{password}</tns:password>
      <tns:testString>ping</tns:testString>
    </tns:TestConnect>
  </soap:Body>
</soap:Envelope>"""
    url = "http://ws.emex.ru/EmEx_Basket.asmx"
    req = urllib.request.Request(
        url,
        data=soap_body.encode('utf-8'),
        headers={
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '"http://tempuri.org/TestConnect"',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            raw = r.read().decode('utf-8')
            if 'Запрос с адреса' in raw or 'TestConnectResult' in raw:
                return {'name': 'EMEX', 'ok': True}
            return {'name': 'EMEX', 'ok': False, 'error': 'Неверный ответ сервера'}
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return {'name': 'EMEX', 'ok': False, 'error': 'Неверный логин или пароль'}
        return {'name': 'EMEX', 'ok': False, 'error': f'Ошибка {e.code}'}
    except Exception as ex:
        return {'name': 'EMEX', 'ok': False, 'error': 'Нет связи с сервером'}


def check_avtorus(token: str) -> dict:
    """Проверка подключения к Авторусь"""
    url = "https://public.api.avtorus.ru/api/v1/profile/clients"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            r.read()
            return {'name': 'Авторусь', 'ok': True}
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return {'name': 'Авторусь', 'ok': False, 'error': 'Неверный токен'}
        return {'name': 'Авторусь', 'ok': False, 'error': f'Ошибка {e.code}'}
    except Exception as e:
        return {'name': 'Авторусь', 'ok': False, 'error': 'Нет связи с сервером'}


def check_exist(login: str, password: str) -> dict:
    """Проверка подключения к Exist.ru"""
    import base64
    creds = base64.b64encode(f"{login}:{password}".encode()).decode()
    url = "https://api.exist.ru/api/v1/info"
    req = urllib.request.Request(url, headers={'Authorization': f'Basic {creds}'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            r.read()
            return {'name': 'Exist.ru', 'ok': True}
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return {'name': 'Exist.ru', 'ok': False, 'error': 'Неверный логин или пароль'}
        return {'name': 'Exist.ru', 'ok': False, 'error': f'Ошибка {e.code}'}
    except Exception:
        return {'name': 'Exist.ru', 'ok': False, 'error': 'Нет связи с сервером'}


def check_rossko(key1: str, key2: str) -> dict:
    """Проверка подключения к Rossko"""
    url = "https://api.rossko.ru/service/v2.1/GetDeliveries"
    payload = json.dumps({'KEY1': key1, 'KEY2': key2}).encode()
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
            if data.get('success') is False or 'error' in str(data.get('message', '')).lower():
                return {'name': 'Rossko', 'ok': False, 'error': 'Неверные ключи KEY1/KEY2'}
            return {'name': 'Rossko', 'ok': True}
    except urllib.error.HTTPError as e:
        return {'name': 'Rossko', 'ok': False, 'error': f'Ошибка {e.code}'}
    except Exception:
        return {'name': 'Rossko', 'ok': False, 'error': 'Нет связи с сервером'}


def handler(event: dict, context) -> dict:
    """Поиск запчастей у поставщиков по сохранённым API-ключам пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    session_token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not session_token:
        return resp(401, {'error': 'Не авторизован'})

    creds = get_user_credentials(session_token)
    if creds is None:
        return resp(401, {'error': 'Сессия истекла'})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    # ── ПРОВЕРКА ПОДКЛЮЧЕНИЯ ──────────────────────────────
    if action == 'check':
        checks = []
        if creds.get('avtorus_token'):
            checks.append(check_avtorus(creds['avtorus_token']))
        if creds.get('exist_login') and creds.get('exist_password'):
            checks.append(check_exist(creds['exist_login'], creds['exist_password']))
        if creds.get('rossko_key1') and creds.get('rossko_key2'):
            checks.append(check_rossko(creds['rossko_key1'], creds['rossko_key2']))
        if creds.get('emex_login') and creds.get('emex_password'):
            checks.append(check_emex(creds['emex_login'], creds['emex_password']))
        if not checks:
            return resp(200, {'connected': [], 'message': 'Нет подключённых поставщиков'})
        return resp(200, {'connected': checks})

    # ── ПОИСК ─────────────────────────────────────────────
    article = params.get('article', '').strip()
    if not article:
        return resp(400, {'error': 'Укажите артикул'})

    results = []
    connected = []

    if creds.get('avtorus_token'):
        connected.append('avtorus')
        results += search_avtorus(article, creds['avtorus_token'])

    if creds.get('exist_login') and creds.get('exist_password'):
        connected.append('exist')
        results += search_exist(article, creds['exist_login'], creds['exist_password'])

    if creds.get('rossko_key1') and creds.get('rossko_key2'):
        connected.append('rossko')
        results += search_rossko(article, creds['rossko_key1'], creds['rossko_key2'])

    if creds.get('emex_login') and creds.get('emex_password'):
        connected.append('emex')
        results += search_emex(article, creds['emex_login'], creds['emex_password'])

    return resp(200, {'results': results, 'connected': connected})