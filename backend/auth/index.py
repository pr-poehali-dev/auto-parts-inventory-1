import json
import os
import secrets
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import psycopg2

SCHEMA = 't_p26023881_auto_parts_inventory'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    }

def resp(status, body):
    return {
        'statusCode': status,
        'headers': {**cors_headers(), 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False),
    }

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def send_reset_email(to_email: str, reset_link: str):
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    from_email = os.environ.get('SMTP_FROM', smtp_user)

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Сброс пароля — PartKeeper.pro'
    msg['From'] = f'PartKeeper.pro <{from_email}>'
    msg['To'] = to_email

    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="margin-bottom: 8px;">Сброс пароля</h2>
      <p style="color: #555;">Вы запросили сброс пароля для аккаунта <b>{to_email}</b>.</p>
      <p style="color: #555;">Нажмите кнопку ниже, чтобы задать новый пароль. Ссылка действует <b>1 час</b>.</p>
      <a href="{reset_link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#000;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Сбросить пароль
      </a>
      <p style="color:#aaa;font-size:12px;">Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, to_email, msg.as_string())

def handler(event: dict, context) -> dict:
    """Авторизация: регистрация, вход, сброс пароля"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    body = json.loads(event.get('body') or '{}')

    conn = get_conn()
    cur = conn.cursor()

    try:
        # ── REGISTER ─────────────────────────────────────────
        if method == 'POST' and action == 'register':
            email = (body.get('email') or '').strip().lower()
            phone = (body.get('phone') or '').strip()
            password = body.get('password', '')

            if not email or not password:
                return resp(400, {'error': 'Email и пароль обязательны'})
            if len(password) < 6:
                return resp(400, {'error': 'Пароль должен быть не менее 6 символов'})

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
            if cur.fetchone():
                return resp(409, {'error': 'Пользователь с таким email уже существует'})

            name = (body.get('name') or '').strip()
            pw_hash = hash_password(password)
            free_until = (datetime.now(timezone.utc) + timedelta(days=90)).date()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.users (phone, email, password_hash, name, free_until)
                VALUES (%s, %s, %s, %s, %s) RETURNING id, email, phone, name
            """, (phone or None, email, pw_hash, name or None, free_until))
            row = cur.fetchone()
            user_id = str(row[0])

            # Создаём сессию
            token = secrets.token_urlsafe(48)
            expires = datetime.now(timezone.utc) + timedelta(days=30)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (user_id, token, expires))
            conn.commit()

            return resp(201, {'token': token, 'user': {'id': user_id, 'email': email, 'phone': phone, 'name': name}})

        # ── LOGIN ─────────────────────────────────────────────
        if method == 'POST' and action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password', '')

            if not email or not password:
                return resp(400, {'error': 'Введите email и пароль'})

            pw_hash = hash_password(password)
            cur.execute(f"""
                SELECT id, email, phone, name FROM {SCHEMA}.users
                WHERE email = %s AND password_hash = %s AND is_active = TRUE
            """, (email, pw_hash))
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Неверный email или пароль'})

            user_id = str(row[0])
            token = secrets.token_urlsafe(48)
            expires = datetime.now(timezone.utc) + timedelta(days=30)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (user_id, token, expires))
            conn.commit()

            # Подписка при логине
            from datetime import date as _date
            cur.execute(f"SELECT paid_until, free_until, is_admin FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            sub = cur.fetchone()
            _today = _date.today()
            _paid = sub[0]; _free = sub[1]; _admin = sub[2]
            _active = _admin or (_free and _free >= _today) or (_paid and _paid >= _today)

            return resp(200, {'token': token, 'user': {
                'id': user_id, 'email': str(row[1]), 'phone': str(row[2] or ''), 'name': str(row[3] or ''),
                'subscription_active': bool(_active),
                'paid_until': str(_paid) if _paid else None,
                'free_until': str(_free) if _free else None,
                'is_admin': _admin,
            }})

        # ── ME (проверка токена) ───────────────────────────────
        if method == 'GET' and action == 'me':
            token = (event.get('headers') or {}).get('X-Session-Token', '')
            if not token:
                return resp(401, {'error': 'Не авторизован'})

            now = datetime.now(timezone.utc)
            cur.execute(f"""
                SELECT u.id, u.email, u.phone, u.name, u.paid_until, u.free_until, u.is_admin FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
            """, (token, now))
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Сессия истекла или недействительна'})

            from datetime import date
            paid_until = row[4]
            free_until = row[5]
            is_admin = row[6]
            today = date.today()

            if is_admin:
                subscription_active = True
            elif free_until and free_until >= today:
                subscription_active = True
            elif paid_until and paid_until >= today:
                subscription_active = True
            else:
                subscription_active = False

            return resp(200, {'user': {
                'id': str(row[0]),
                'email': str(row[1]),
                'phone': str(row[2] or ''),
                'name': str(row[3] or ''),
                'subscription_active': subscription_active,
                'paid_until': str(paid_until) if paid_until else None,
                'free_until': str(free_until) if free_until else None,
                'is_admin': is_admin,
            }})

        # ── FORGOT PASSWORD ───────────────────────────────────
        if method == 'POST' and action == 'forgot':
            email = (body.get('email') or '').strip().lower()
            if not email:
                return resp(400, {'error': 'Введите email'})

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s AND is_active = TRUE", (email,))
            row = cur.fetchone()
            # Всегда возвращаем успех — чтобы не раскрывать существование аккаунта
            if not row:
                return resp(200, {'ok': True})

            user_id = str(row[0])
            reset_token = secrets.token_urlsafe(48)
            expires = datetime.now(timezone.utc) + timedelta(hours=1)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.password_reset_tokens (user_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (user_id, reset_token, expires))
            conn.commit()

            site_url = os.environ.get('SITE_URL', 'https://partkeeper.pro')
            reset_link = f"{site_url}?reset_token={reset_token}"

            try:
                send_reset_email(email, reset_link)
            except Exception as e:
                return resp(502, {'error': f'Ошибка отправки письма: {str(e)}'})

            return resp(200, {'ok': True})

        # ── RESET PASSWORD ────────────────────────────────────
        if method == 'POST' and action == 'reset':
            reset_token = body.get('token', '')
            new_password = body.get('password', '')

            if not reset_token or not new_password:
                return resp(400, {'error': 'Токен и новый пароль обязательны'})
            if len(new_password) < 6:
                return resp(400, {'error': 'Пароль должен быть не менее 6 символов'})

            now = datetime.now(timezone.utc)
            cur.execute(f"""
                SELECT id, user_id FROM {SCHEMA}.password_reset_tokens
                WHERE token = %s AND expires_at > %s AND used = FALSE
            """, (reset_token, now))
            row = cur.fetchone()
            if not row:
                return resp(400, {'error': 'Ссылка недействительна или устарела'})

            token_id = row[0]
            user_id = row[1]
            pw_hash = hash_password(new_password)

            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (pw_hash, user_id))
            cur.execute(f"UPDATE {SCHEMA}.password_reset_tokens SET used = TRUE WHERE id = %s", (token_id,))
            conn.commit()

            return resp(200, {'ok': True})

        # ── UPDATE PROFILE ────────────────────────────────────
        if method == 'POST' and action == 'update':
            token = (event.get('headers') or {}).get('X-Session-Token', '')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            now = datetime.now(timezone.utc)
            cur.execute(f"""
                SELECT u.id FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
            """, (token, now))
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Сессия истекла'})
            user_id = row[0]

            fields = []
            values = []
            if 'name' in body:
                fields.append('name = %s')
                values.append((body['name'] or '').strip() or None)
            if 'phone' in body:
                fields.append('phone = %s')
                values.append((body['phone'] or '').strip() or None)
            if 'password' in body and body['password']:
                if len(body['password']) < 6:
                    return resp(400, {'error': 'Пароль должен быть не менее 6 символов'})
                old_password = body.get('oldPassword', '')
                if not old_password:
                    return resp(400, {'error': 'Введите текущий пароль для его смены'})
                cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE id = %s", (user_id,))
                pw_row = cur.fetchone()
                if not pw_row or pw_row[0] != hash_password(old_password):
                    return resp(400, {'error': 'Текущий пароль введён неверно'})
                fields.append('password_hash = %s')
                values.append(hash_password(body['password']))

            if fields:
                values.append(user_id)
                cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(fields)} WHERE id = %s RETURNING id, email, phone, name", values)
                upd = cur.fetchone()
                conn.commit()
                return resp(200, {'user': {'id': str(upd[0]), 'email': str(upd[1]), 'phone': str(upd[2] or ''), 'name': str(upd[3] or '')}})
            return resp(400, {'error': 'Нет данных для обновления'})

        # ── GET COMPANY SETTINGS ──────────────────────────────
        if method == 'GET' and action == 'company':
            cur.execute(f"SELECT key, value FROM {SCHEMA}.company_settings")
            rows = cur.fetchall()
            return resp(200, {r[0]: (r[1] or '') for r in rows})

        # ── SAVE COMPANY SETTINGS ─────────────────────────────
        if method == 'POST' and action == 'company':
            token_hdr = (event.get('headers') or {}).get('X-Session-Token', '')
            if not token_hdr:
                return resp(401, {'error': 'Не авторизован'})
            now = datetime.now(timezone.utc)
            cur.execute(f"""
                SELECT u.id FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > %s AND u.is_active = TRUE
            """, (token_hdr, now))
            if not cur.fetchone():
                return resp(401, {'error': 'Сессия истекла'})

            allowed = ['name', 'inn', 'ogrn', 'address', 'phone', 'email',
                       'exist_login', 'exist_password',
                       'emex_login', 'emex_password', 'autodoc_token',
                       'rossko_key1', 'rossko_key2',
                       'avtorus_token', 'armtek_token']
            for key in allowed:
                if key in body:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.company_settings (key, value)
                        VALUES (%s, %s)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                    """, (key, (body[key] or '').strip()))
            conn.commit()
            cur.execute(f"SELECT key, value FROM {SCHEMA}.company_settings")
            rows = cur.fetchall()
            return resp(200, {r[0]: (r[1] or '') for r in rows})

        # ── LOGOUT ────────────────────────────────────────────
        if method == 'POST' and action == 'logout':
            token = (event.get('headers') or {}).get('X-Session-Token', '')
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'Метод не поддерживается'})

    finally:
        cur.close()
        conn.close()