import json
import urllib.request
import urllib.parse

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

def resp(status, body):
    return {
        'statusCode': status,
        'headers': {**cors_headers(), 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False),
    }

def handler(event: dict, context) -> dict:
    """Декодирование VIN-номера через бесплатный NHTSA API"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    qs = event.get('queryStringParameters') or {}
    vin = (qs.get('vin') or '').strip().upper()

    if not vin or len(vin) < 11:
        return resp(400, {'error': 'Укажите корректный VIN (минимум 11 символов)'})

    try:
        url = f'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{urllib.parse.quote(vin)}?format=json'
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode())

        results = data.get('Results', [])

        # Извлекаем нужные поля
        fields_map = {
            'Make': 'make',
            'Model': 'model',
            'Model Year': 'year',
            'Engine Number of Cylinders': 'cylinders',
            'Displacement (L)': 'displacement',
            'Fuel Type - Primary': 'fuel',
            'Drive Type': 'drive',
            'Transmission Style': 'transmission',
            'Body Class': 'body',
            'Plant Country': 'country',
            'Manufacturer Name': 'manufacturer',
            'Vehicle Type': 'vehicleType',
            'Engine Model': 'engineModel',
            'Turbo': 'turbo',
        }

        info = {}
        for item in results:
            variable = item.get('Variable', '')
            value = item.get('Value', '')
            if variable in fields_map and value and value not in ('Not Applicable', 'null', None, '0'):
                info[fields_map[variable]] = value

        return resp(200, {
            'vin': vin,
            'info': info,
        })

    except Exception as e:
        return resp(502, {'error': f'Ошибка запроса к NHTSA: {str(e)}'})
