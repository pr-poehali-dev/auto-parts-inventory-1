import json
import os
import psycopg2
from datetime import datetime, timezone

SCHEMA = "t_p26023881_auto_parts_inventory"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_from_token(conn, token):
    if not token:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.name, u.phone FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        row = cur.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "phone": row[2]}
    return None

def is_admin(conn, user_id):
    with conn.cursor() as cur:
        cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row and row[0] == "+79680066666"

def handler(event: dict, context) -> dict:
    """Обратная связь: отправка сообщений пользователями и управление в админке."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    token = event.get("headers", {}).get("X-Authorization", "").replace("Bearer ", "")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()

    # POST / — отправить сообщение (любой авторизованный пользователь)
    if method == "POST" and path in ("/", ""):
        user = get_user_from_token(conn, token)
        message = body.get("message", "").strip()
        if not message:
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Сообщение не может быть пустым"})}

        user_id = user["id"] if user else None
        user_name = user["name"] if user else body.get("name", "Гость")
        user_phone = user["phone"] if user else body.get("phone", "")

        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {SCHEMA}.feedback (user_id, user_name, user_phone, message) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, user_name, user_phone, message)
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": new_id, "ok": True})}

    # GET / — список сообщений (только админ)
    if method == "GET" and path in ("/", ""):
        user = get_user_from_token(conn, token)
        if not user or not is_admin(conn, user["id"]):
            conn.close()
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Нет доступа"})}

        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, user_id, user_name, user_phone, message, reply, is_read, replied_at, created_at FROM {SCHEMA}.feedback ORDER BY created_at DESC"
            )
            rows = cur.fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0],
                "user_id": r[1],
                "user_name": r[2],
                "user_phone": r[3],
                "message": r[4],
                "reply": r[5],
                "is_read": r[6],
                "replied_at": r[7].isoformat() if r[7] else None,
                "created_at": r[8].isoformat() if r[8] else None,
            })

        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"items": items})}

    # PUT /reply — ответить на сообщение (только админ)
    if method == "PUT":
        user = get_user_from_token(conn, token)
        if not user or not is_admin(conn, user["id"]):
            conn.close()
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Нет доступа"})}

        feedback_id = body.get("id")
        reply = body.get("reply", "").strip()
        mark_read = body.get("mark_read", False)

        if feedback_id and reply:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.feedback SET reply = %s, is_read = TRUE, replied_at = NOW() WHERE id = %s",
                    (reply, feedback_id)
                )
        elif feedback_id and mark_read:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.feedback SET is_read = TRUE WHERE id = %s",
                    (feedback_id,)
                )

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "Not found"})}
